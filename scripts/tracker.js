/**
 * TrackerRenderer - Core canvas rendering for party and equipment trackers
 */

import { getPartyTrackerSettings, getEquipmentTrackerSettings, getSetting, VISIBILITY } from "./settings.js";
import { PartyTracker } from "./party-tracker.js";
import { EquipmentTracker } from "./equipment-tracker.js";

const MODULE_ID = "ptr2e-party-tracker";

export class TrackerRenderer {
  constructor() {
    this.partyTracker = new PartyTracker();
    this.equipmentTracker = new EquipmentTracker();
    this.trackerContainers = new Map();
    this.hoveredTokens = new Set();
    this.controlledTokens = new Set();
    this.pendingRefreshes = new Map(); // Debounce per-token
    this.activeRefreshes = new Map(); // Track in-progress refreshes
    this.queuedRefreshes = new Map(); // Queue refreshes while one is running
  }

  initialize() {
    console.log(`${MODULE_ID} | TrackerRenderer initialized`);
  }

  async refresh() {
    if (!canvas.ready || !canvas.tokens) return;

    const promises = canvas.tokens.placeables.map(token => this.refreshToken(token));
    await Promise.all(promises);
  }

  refreshToken(token) {
    if (!token || !token.actor) return;

    // If a refresh is already running for this token, queue another
    if (this.activeRefreshes.has(token.id)) {
      this.queuedRefreshes.set(token.id, token);
      return;
    }

    // Cancel any pending debounced refresh
    const pending = this.pendingRefreshes.get(token.id);
    if (pending) {
      clearTimeout(pending);
    }

    // Schedule refresh after brief delay to coalesce rapid calls
    this.pendingRefreshes.set(token.id, setTimeout(() => {
      this.pendingRefreshes.delete(token.id);
      this._startRefresh(token);
    }, 50));
  }

  async _startRefresh(token) {
    // Mark this token as having an active refresh
    this.activeRefreshes.set(token.id, true);

    try {
      await this._doRefreshToken(token);
    } finally {
      this.activeRefreshes.delete(token.id);

      // If another refresh was queued while we were running, start it
      const queued = this.queuedRefreshes.get(token.id);
      if (queued) {
        this.queuedRefreshes.delete(token.id);
        this.refreshToken(queued);
      }
    }
  }

  async _doRefreshToken(token) {
    if (!token || !token.actor) return;

    console.log(`${MODULE_ID} | refreshToken:`, token.id, token.name);

    // Don't destroy entire container - just clear tracker children
    // This prevents orphaning issues during Foundry's refresh cycle
    const container = this.getOrCreateContainer(token);
    const partyChild = container.getChildByName("party-tracker");
    if (partyChild) partyChild.destroy({ children: true });
    const equipChild = container.getChildByName("equipment-tracker");
    if (equipChild) equipChild.destroy({ children: true });

    const partySettings = getPartyTrackerSettings(token);
    const equipSettings = getEquipmentTrackerSettings(token);

    console.log(`${MODULE_ID} | refreshToken settings:`, partySettings, equipSettings);

    const renderPromises = [];

    const partyShow = this.shouldShow(token, partySettings.visibility);
    const equipShow = this.shouldShow(token, equipSettings.visibility);
    console.log(`${MODULE_ID} | shouldShow - party: ${partyShow}, equip: ${equipShow}`);

    if (partySettings.enabled && partyShow) {
      renderPromises.push(this.renderPartyTracker(token, partySettings));
    }

    if (equipSettings.enabled && equipShow) {
      renderPromises.push(this.renderEquipmentTracker(token, equipSettings));
    }

    await Promise.all(renderPromises);

    // Log final container state for debugging
    const finalContainer = this.trackerContainers.get(token.id);
    if (finalContainer) {
      console.log(`${MODULE_ID} | refreshToken complete: container visible=${finalContainer.visible}, parent=${finalContainer.parent?.constructor?.name}, children=${finalContainer.children.length}, worldTransform=`, finalContainer.worldTransform);
    } else {
      console.log(`${MODULE_ID} | refreshToken complete: NO CONTAINER`);
    }
  }

  refreshActorTokens(actor) {
    if (!canvas.ready || !canvas.tokens) return;

    for (const token of canvas.tokens.placeables) {
      if (token.actor?.id === actor.id) {
        this.refreshToken(token);
      }
    }

    if (actor.party?.party) {
      for (const member of actor.party.party) {
        if (member.id !== actor.id) {
          const ownerActor = this.findPartyOwner(member);
          if (ownerActor) {
            for (const token of canvas.tokens.placeables) {
              if (token.actor?.id === ownerActor.id) {
                this.refreshToken(token);
              }
            }
          }
        }
      }
    }
  }

  findPartyOwner(pokemon) {
    const partyMemberOf = pokemon.system?.party?.partyMemberOf;
    if (!partyMemberOf) return null;

    const folder = game.folders.get(partyMemberOf);
    if (!folder) return null;

    return folder.contents?.find(a => a.system?.party?.ownerOf === partyMemberOf);
  }

  shouldShow(token, visibility) {
    const isOwner = token.isOwner;
    const isGM = game.user.isGM;
    const isHovered = this.hoveredTokens.has(token.id);
    const isControlled = this.controlledTokens.has(token.id);

    switch (visibility) {
      case VISIBILITY.ALWAYS:
        return true;
      case VISIBILITY.HOVER:
        return isHovered;
      case VISIBILITY.OWNER:
        return isOwner || isGM;
      case VISIBILITY.OWNER_HOVER:
        return isOwner || isGM || isHovered;
      case VISIBILITY.GM:
        return isGM;
      case VISIBILITY.CONTROL:
        return isControlled;
      case VISIBILITY.NONE:
        return false;
      default:
        return true;
    }
  }

  clearTrackers(token) {
    const container = this.trackerContainers.get(token.id);
    if (container) {
      console.log(`${MODULE_ID} | clearTrackers: destroying container for ${token.id}`);
      // Remove from parent (interface or tokens layer)
      if (container.parent) {
        container.parent.removeChild(container);
      }
      container.destroy({ children: true });
      this.trackerContainers.delete(token.id);
    }
  }

  getOrCreateContainer(token) {
    let container = this.trackerContainers.get(token.id);

    // Check if container was orphaned (Foundry may remove children during redraws)
    if (container) {
      const isOrphaned = !container.parent || container.destroyed;
      console.log(`${MODULE_ID} | getOrCreateContainer: existing container, parent=${container.parent?.constructor?.name}, destroyed=${container.destroyed}, orphaned=${isOrphaned}, visible=${container.visible}, alpha=${container.alpha}`);
      if (isOrphaned) {
        console.log(`${MODULE_ID} | Container orphaned, recreating`);
        if (!container.destroyed) container.destroy({ children: true });
        container = null;
        this.trackerContainers.delete(token.id);
      }
    }

    if (!container) {
      container = new PIXI.Container();
      container.name = `${MODULE_ID}-tracker-${token.id}`;
      container.zIndex = 1000; // High z-index to ensure visibility
      container.visible = true;

      // Store token reference for position updates
      container._tokenRef = token;

      // Add to the interface layer (above tokens, survives token redraws)
      if (canvas.interface) {
        canvas.interface.addChild(container);
        canvas.interface.sortableChildren = true;
      } else {
        // Fallback to tokens layer
        canvas.tokens.addChild(container);
        canvas.tokens.sortableChildren = true;
      }

      this.trackerContainers.set(token.id, container);
      console.log(`${MODULE_ID} | getOrCreateContainer: created new container on interface layer`);
    }

    // Update container position to match token's world position
    container.x = token.x;
    container.y = token.y;

    return container;
  }

  async renderPartyTracker(token, settings) {
    const partyData = this.partyTracker.getPartyData(token.actor);
    console.log(`${MODULE_ID} | renderPartyTracker: partyData length=${partyData?.length || 0}`);
    if (!partyData || partyData.length === 0) return;

    const container = this.getOrCreateContainer(token);
    console.log(`${MODULE_ID} | renderPartyTracker: container parent=${container.parent?.constructor?.name}, children=${container.children.length}`);

    const partyContainer = new PIXI.Container();
    partyContainer.name = "party-tracker";

    const position = this.calculatePosition(token, settings, partyData.length);

    await this.partyTracker.render(partyContainer, partyData, settings, position);
    console.log(`${MODULE_ID} | renderPartyTracker: rendered ${partyContainer.children.length} icons at (${position.x}, ${position.y})`);

    container.addChild(partyContainer);
  }

  async renderEquipmentTracker(token, settings) {
    const equipmentData = this.equipmentTracker.getEquipmentData(token.actor);
    if (!equipmentData || equipmentData.length === 0) return;

    const container = this.getOrCreateContainer(token);
    const equipContainer = new PIXI.Container();
    equipContainer.name = "equipment-tracker";

    const position = this.calculatePosition(token, settings, equipmentData.length);

    await this.equipmentTracker.render(equipContainer, equipmentData, settings, position);

    container.addChild(equipContainer);
  }

  calculatePosition(token, settings, itemCount) {
    const { position, offsetX, offsetY, iconSize, spacing, direction } = settings;
    const tokenWidth = token.w;
    const tokenHeight = token.h;

    const itemExtent = itemCount * iconSize + (itemCount - 1) * spacing;
    const width = direction === "horizontal" ? itemExtent : iconSize;
    const height = direction === "vertical" ? itemExtent : iconSize;

    let x = 0;
    let y = 0;

    switch (position) {
      case "top":
        x = (tokenWidth - width) / 2;
        y = -height - 4;
        break;
      case "bottom":
        x = (tokenWidth - width) / 2;
        y = tokenHeight + 4;
        break;
      case "left":
        x = -width - 4;
        y = (tokenHeight - height) / 2;
        break;
      case "right":
        x = tokenWidth + 4;
        y = (tokenHeight - height) / 2;
        break;
    }

    return {
      x: x + offsetX,
      y: y + offsetY
    };
  }

  onTokenHover(token, hovered) {
    if (hovered) {
      this.hoveredTokens.add(token.id);
    } else {
      this.hoveredTokens.delete(token.id);
    }
    // Toggle visibility only - don't re-render (prevents flicker and race conditions)
    this.updateTrackerVisibility(token);
  }

  onTokenControl(token, controlled) {
    if (controlled) {
      this.controlledTokens.add(token.id);
    } else {
      this.controlledTokens.delete(token.id);
    }
    // Toggle visibility only - don't re-render (prevents flicker and race conditions)
    this.updateTrackerVisibility(token);
  }

  updateTrackerVisibility(token) {
    const container = this.trackerContainers.get(token.id);

    // If container doesn't exist or is orphaned, trigger a full refresh to recreate it
    if (!container || !container.parent || container.destroyed) {
      console.log(`${MODULE_ID} | updateTrackerVisibility: container missing/orphaned, triggering refresh`);
      this.refreshToken(token);
      return;
    }

    const partySettings = getPartyTrackerSettings(token);
    const equipSettings = getEquipmentTrackerSettings(token);

    const partyContainer = container.getChildByName("party-tracker");
    if (partyContainer) {
      partyContainer.visible = this.shouldShow(token, partySettings.visibility);
    }

    const equipContainer = container.getChildByName("equipment-tracker");
    if (equipContainer) {
      equipContainer.visible = this.shouldShow(token, equipSettings.visibility);
    }
  }
}
