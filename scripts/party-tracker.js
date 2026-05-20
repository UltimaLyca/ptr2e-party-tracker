/**
 * PartyTracker - Handles party status data and rendering
 */

import { getSetting, DEFAULT_SETTINGS } from "./settings.js";

const MODULE_ID = "ptr2e-party-tracker";

// Major afflictions - persist even when Pokemon is returned to pokeball
const STATUS_CONDITIONS = {
  FAINTED: "fainted",
  POISONED: "poisoned",
  BADLY_POISONED: "badly-poisoned",
  BURNED: "burned",
  PARALYZED: "paralyzed",
  FROZEN: "frozen",
  ASLEEP: "asleep"
};

const PTR2E_CONDITION_MAP = {
  "poison": STATUS_CONDITIONS.POISONED,
  "poisoned": STATUS_CONDITIONS.POISONED,
  "badly-poisoned": STATUS_CONDITIONS.BADLY_POISONED,
  "badlyPoisoned": STATUS_CONDITIONS.BADLY_POISONED,
  "badly poisoned": STATUS_CONDITIONS.BADLY_POISONED,
  "burn": STATUS_CONDITIONS.BURNED,
  "burned": STATUS_CONDITIONS.BURNED,
  "paralysis": STATUS_CONDITIONS.PARALYZED,
  "paralyzed": STATUS_CONDITIONS.PARALYZED,
  "freeze": STATUS_CONDITIONS.FROZEN,
  "frozen": STATUS_CONDITIONS.FROZEN,
  "sleep": STATUS_CONDITIONS.ASLEEP,
  "asleep": STATUS_CONDITIONS.ASLEEP
};

export class PartyTracker {
  constructor() {
    this.iconCache = new Map();
  }

  getPartyData(actor) {
    if (!actor) return [];

    const partyData = actor.party;
    if (!partyData?.party) return [];

    const partyCap = getSetting("partyCap");
    const partyMembers = partyData.party.filter(p => p && p.id !== actor.id);

    const slots = [];

    for (let i = 0; i < partyCap; i++) {
      if (i < partyMembers.length) {
        const pokemon = partyMembers[i];
        slots.push(this.getPokemonStatus(pokemon));
      } else {
        slots.push({ status: "empty", pokemon: null, conditions: [] });
      }
    }

    return slots;
  }

  getPokemonStatus(pokemon) {
    if (!pokemon) {
      return { status: "empty", pokemon: null, conditions: [] };
    }

    const hp = pokemon.system?.health?.value ?? 0;
    const maxHp = pokemon.system?.health?.max ?? 1;
    const conditions = this.getConditions(pokemon);

    let status = "ok";
    if (hp <= 0) {
      status = "fainted";
    }

    return {
      status,
      pokemon,
      conditions,
      hp,
      maxHp,
      name: pokemon.name,
      img: pokemon.img
    };
  }

  getConditions(pokemon) {
    const conditions = [];

    // Primary source: statuses array (PTR2e stores afflictions here)
    if (pokemon.statuses) {
      const statusList = Array.isArray(pokemon.statuses) ? pokemon.statuses : Array.from(pokemon.statuses);
      for (const status of statusList) {
        const statusId = typeof status === "string" ? status : status?.id || status?.name || "";
        if (statusId) {
          const mappedCondition = PTR2E_CONDITION_MAP[statusId.toLowerCase()];
          if (mappedCondition && !conditions.includes(mappedCondition)) {
            conditions.push(mappedCondition);
          }
        }
      }
    }

    // Fallback: check appliedEffects by name
    if (pokemon.appliedEffects) {
      for (const effect of pokemon.appliedEffects) {
        const effectName = effect.name?.toLowerCase() || "";
        const mappedCondition = PTR2E_CONDITION_MAP[effectName];
        if (mappedCondition && !conditions.includes(mappedCondition)) {
          conditions.push(mappedCondition);
        }
      }
    }

    // Fallback: check system.conditions
    const actorConditions = pokemon.system?.conditions || pokemon.conditions || [];
    if (Array.isArray(actorConditions)) {
      for (const condition of actorConditions) {
        const conditionId = typeof condition === "string" ? condition : condition?.id || condition?.name;
        if (conditionId) {
          const mappedCondition = PTR2E_CONDITION_MAP[conditionId.toLowerCase()];
          if (mappedCondition && !conditions.includes(mappedCondition)) {
            conditions.push(mappedCondition);
          }
        }
      }
    }

    if (conditions.length > 0) {
      console.log(`${MODULE_ID} | ${pokemon.name} has conditions:`, conditions);
    }

    return conditions;
  }

  async render(container, partyData, settings, position) {
    const { iconSize, spacing, direction, useSprites } = settings;
    const icons = getSetting("icons");
    const modifiers = getSetting("modifiers");

    container.x = position.x;
    container.y = position.y;

    for (let i = 0; i < partyData.length; i++) {
      const slot = partyData[i];
      const slotContainer = new PIXI.Container();

      const offset = direction === "horizontal"
        ? { x: i * (iconSize + spacing), y: 0 }
        : { x: 0, y: i * (iconSize + spacing) };

      slotContainer.x = offset.x;
      slotContainer.y = offset.y;

      let iconPath;
      if (slot.status === "empty") {
        iconPath = icons.empty || DEFAULT_SETTINGS.icons.empty;
      } else if (slot.status === "fainted") {
        iconPath = icons.fainted || DEFAULT_SETTINGS.icons.fainted;
      } else if (useSprites && slot.pokemon?.img) {
        iconPath = slot.pokemon.img;
      } else {
        iconPath = icons.ok || DEFAULT_SETTINGS.icons.ok;
      }

      try {
        const baseSprite = await this.createSprite(iconPath, iconSize);
        if (baseSprite) {
          if (slot.status === "empty") {
            baseSprite.tint = 0x555555;
            baseSprite.alpha = 0.5;
          } else if (slot.status === "fainted") {
            baseSprite.tint = 0x666666;
          } else if (slot.conditions.length > 0) {
            const primaryCondition = slot.conditions[0];
            const modifier = modifiers[primaryCondition];
            if (modifier?.tint) {
              baseSprite.tint = PIXI.utils.string2hex(modifier.tint);
            }
          }

          slotContainer.addChild(baseSprite);

          // Render condition badges spread around the upper arc of the pokeball
          const badgeConditions = slot.conditions.filter(c => modifiers[c]?.badge);
          if (badgeConditions.length > 0) {
            const badgeCount = badgeConditions.length;
            // Shrink badges based on count: 35% for 1-2, smaller for more
            const badgeSizeRatio = badgeCount <= 2 ? 0.35 : badgeCount <= 4 ? 0.28 : 0.22;
            const badgeSize = iconSize * badgeSizeRatio;

            // Position badges along upper arc (semicircle from left to right)
            const centerX = iconSize / 2;
            const centerY = iconSize / 2;
            const radius = iconSize * 0.42;

            for (let j = 0; j < badgeConditions.length; j++) {
              const condition = badgeConditions[j];
              const modifier = modifiers[condition];
              const badgeSprite = await this.createSprite(modifier.badge, badgeSize);
              if (badgeSprite) {
                // Spread evenly from ~150° to ~30° (upper arc)
                const angleStart = Math.PI * 0.83;
                const angleEnd = Math.PI * 0.17;
                const angle = badgeCount === 1
                  ? Math.PI / 2  // Single badge centered at top
                  : angleStart - (angleStart - angleEnd) * (j / (badgeCount - 1));

                badgeSprite.x = centerX + Math.cos(angle) * radius - badgeSize / 2;
                badgeSprite.y = centerY - Math.sin(angle) * radius - badgeSize / 2;
                slotContainer.addChild(badgeSprite);
              }
            }
          }
        }
      } catch (err) {
        console.warn(`${MODULE_ID} | Failed to load icon: ${iconPath}`, err);
        const placeholder = this.createPlaceholder(iconSize, slot.status);
        slotContainer.addChild(placeholder);
      }

      container.addChild(slotContainer);
    }
  }

  async createSprite(path, size) {
    if (!path) return null;

    try {
      const texture = await foundry.canvas.loadTexture(path);
      if (!texture) return null;

      // Use nearest-neighbor scaling for sharper icons
      texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;

      const sprite = new PIXI.Sprite(texture);
      // Scale proportionally to fit within size while maintaining aspect ratio
      const scale = Math.min(size / texture.width, size / texture.height);
      sprite.scale.set(scale, scale);
      // Center the sprite if it doesn't fill the full size
      sprite.x = (size - texture.width * scale) / 2;
      sprite.y = (size - texture.height * scale) / 2;

      return sprite;
    } catch (err) {
      console.warn(`${MODULE_ID} | Failed to create sprite from ${path}`, err);
      return null;
    }
  }

  createPlaceholder(size, status) {
    const graphics = new PIXI.Graphics();

    let color = 0xcccccc;
    if (status === "ok") color = 0xff5555;
    else if (status === "fainted") color = 0x555555;
    else if (status === "empty") color = 0x333333;

    graphics.beginFill(color);
    graphics.drawCircle(size / 2, size / 2, size / 2 - 2);
    graphics.endFill();

    graphics.lineStyle(2, 0x222222);
    graphics.moveTo(2, size / 2);
    graphics.lineTo(size - 2, size / 2);

    return graphics;
  }
}
