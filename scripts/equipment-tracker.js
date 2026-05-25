/**
 * EquipmentTracker - Handles belt/equipment data and rendering
 */

const MODULE_ID = "ptr2e-party-tracker";

export class EquipmentTracker {
  constructor() {
    this.iconCache = new Map();
  }

  getEquipmentData(actor, settings = {}) {
    if (!actor) return [];

    const items = actor.items || [];
    const itemArray = items.contents || Array.from(items) || [];

    // Types to EXCLUDE (abilities, perks, moves, species info)
    const excludeTypes = ["perk", "ability", "move", "species", "effect", "condition", "action", "feat", "edge", "pokeedge", "capability", "summon"];

    // Get slot visibility from passed settings (with defaults)
    const {
      showBelt = true,
      showHeld = true,
      showWorn = false,
      showAccessory = false,
      showBackpack = false,
      showStowed = false,
      showSlotless = false
    } = settings;

    const result = [];

    for (const item of itemArray) {
      const type = item.type?.toLowerCase() || "";

      // Skip excluded types
      if (excludeTypes.includes(type)) {
        continue;
      }

      const system = item.system || {};
      const equipped = system.equipped || {};
      const carryType = equipped.carryType || "";
      const slot = equipped.slot || "";

      // Check if this item should be shown based on slot settings
      let shouldShow = false;

      if (carryType === "stowed" && showStowed) {
        shouldShow = true;
      } else if (carryType === "equipped") {
        switch (slot) {
          case "belt":
            shouldShow = showBelt;
            break;
          case "held":
            shouldShow = showHeld;
            break;
          case "worn":
            shouldShow = showWorn;
            break;
          case "accessory":
            shouldShow = showAccessory;
            break;
          case "backpack":
            shouldShow = showBackpack;
            break;
          case "":
          case "slotless":
            shouldShow = showSlotless;
            break;
          default:
            // Unknown slot - show if slotless is enabled
            shouldShow = showSlotless;
        }
      } else if (!carryType || carryType === "") {
        // Items without carryType are treated as slotless
        shouldShow = showSlotless;
      }

      if (shouldShow) {
        result.push(this.formatItem(item, slot === "belt" || slot === "held"));
      }
    }

    return result;
  }

  isBeltItem(item) {
    const system = item.system || {};
    const equipped = system.equipped || {};

    // PTR2e: Belt items are held items that are equipped
    // Check if it's equipped and in "held" slot
    if (equipped.carryType === "equipped" && equipped.slot === "held") {
      return true;
    }

    return false;
  }

  isEquipped(item) {
    const system = item.system || {};
    const equipped = system.equipped || {};

    // PTR2e: Items are equipped when carryType is "equipped"
    // Slots: backpack, accessory, worn, held
    if (equipped.carryType === "equipped") {
      return true;
    }

    return false;
  }

  formatItem(item, isBelt) {
    const system = item.system || {};

    return {
      id: item.id,
      name: item.name,
      img: item.img,
      quantity: system.quantity || system.uses?.value || 1,
      maxQuantity: system.maxQuantity || system.uses?.max || null,
      isBelt,
      type: item.type
    };
  }

  async render(container, equipmentData, settings, position) {
    const { iconSize, spacing, direction, showStackCount, maxItems } = settings;

    container.x = position.x;
    container.y = position.y;

    const itemsToRender = equipmentData.slice(0, maxItems);

    for (let i = 0; i < itemsToRender.length; i++) {
      const item = itemsToRender[i];
      const itemContainer = new PIXI.Container();

      const offset = direction === "horizontal"
        ? { x: i * (iconSize + spacing), y: 0 }
        : { x: 0, y: i * (iconSize + spacing) };

      itemContainer.x = offset.x;
      itemContainer.y = offset.y;

      try {
        const sprite = await this.createSprite(item.img, iconSize);
        if (sprite) {
          itemContainer.addChild(sprite);
        } else {
          const placeholder = this.createPlaceholder(iconSize);
          itemContainer.addChild(placeholder);
        }
      } catch (err) {
        console.warn(`${MODULE_ID} | Failed to load item icon: ${item.img}`, err);
        const placeholder = this.createPlaceholder(iconSize);
        itemContainer.addChild(placeholder);
      }

      if (showStackCount && item.quantity > 1) {
        const countText = this.createStackCount(item.quantity, iconSize);
        itemContainer.addChild(countText);
      }

      container.addChild(itemContainer);
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

  createPlaceholder(size) {
    const graphics = new PIXI.Graphics();

    graphics.beginFill(0x666666);
    graphics.drawRoundedRect(0, 0, size, size, 4);
    graphics.endFill();

    graphics.lineStyle(1, 0x444444);
    graphics.drawRoundedRect(1, 1, size - 2, size - 2, 3);

    return graphics;
  }

  createStackCount(count, iconSize) {
    const text = new PIXI.Text(`×${count}`, {
      fontFamily: "Signika",
      fontSize: Math.max(10, iconSize * 0.4),
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: 2,
      fontWeight: "bold"
    });

    text.anchor.set(1, 1);
    text.x = iconSize;
    text.y = iconSize;

    return text;
  }
}
