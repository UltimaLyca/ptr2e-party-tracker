const MODULE_ID = "ptr2e-party-tracker";

// Preview settings storage (for real-time preview in token config)
const previewSettings = new Map();

export const POSITIONS = {
  TOP: "top",
  BOTTOM: "bottom",
  LEFT: "left",
  RIGHT: "right"
};

export const DIRECTIONS = {
  HORIZONTAL: "horizontal",
  VERTICAL: "vertical"
};

export const VISIBILITY = {
  ALWAYS: "always",
  HOVER: "hover",
  OWNER: "owner",
  OWNER_HOVER: "ownerHover",
  GM: "gm",
  CONTROL: "control",
  NONE: "none"
};

export const DEFAULT_SETTINGS = {
  partyTracker: {
    enabled: true,
    position: POSITIONS.TOP,
    offsetX: 0,
    offsetY: -10,
    iconSize: 24,
    spacing: 2,
    direction: DIRECTIONS.HORIZONTAL,
    visibility: VISIBILITY.OWNER,
    useSprites: false
  },
  equipmentTracker: {
    enabled: true,
    position: POSITIONS.BOTTOM,
    offsetX: 0,
    offsetY: 10,
    iconSize: 20,
    spacing: 2,
    direction: DIRECTIONS.HORIZONTAL,
    visibility: VISIBILITY.OWNER,
    showStackCount: true,
    maxItems: 6,
    showBelt: true,
    showHeld: true,
    showWorn: false,
    showAccessory: false,
    showBackpack: false,
    showStowed: false,
    showSlotless: false
  },
  partyCap: 6,
  modifiers: {
    poisoned: { tint: "#9b59b6", badge: "systems/ptr2e/img/conditions/poisoned.svg" },
    "badly-poisoned": { tint: "#6b2c91", badge: "systems/ptr2e/img/conditions/badly-poisoned.svg" },
    burned: { tint: "#e74c3c", badge: "systems/ptr2e/img/conditions/burned.svg" },
    paralyzed: { tint: "#f1c40f", badge: "systems/ptr2e/img/conditions/paralysis.svg" },
    frozen: { tint: "#3498db", badge: "systems/ptr2e/img/conditions/frozen.svg" },
    asleep: { tint: "#2c3e50", badge: "systems/ptr2e/img/conditions/sleep.svg" }
  },
  icons: {
    ok: "systems/ptr2e/img/item-icons/basic ball.webp",
    empty: "systems/ptr2e/img/item-icons/basic ball.webp",
    fainted: "systems/ptr2e/img/item-icons/basic ball.webp"
  }
};

export function registerSettings() {
  // Global setting: Party Cap
  game.settings.register(MODULE_ID, "partyCap", {
    name: game.i18n.localize(`${MODULE_ID}.settings.partyCap.name`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.partyCap.hint`),
    scope: "world",
    config: true,
    type: Number,
    default: DEFAULT_SETTINGS.partyCap,
    range: { min: 1, max: 20, step: 1 }
  });

  // Defaults for Humanoid actors
  game.settings.register(MODULE_ID, "defaultsHumanoid", {
    name: game.i18n.localize(`${MODULE_ID}.settings.defaultsHumanoid.name`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.defaultsHumanoid.hint`),
    scope: "world",
    config: false,
    type: Object,
    default: {
      partyTracker: { ...DEFAULT_SETTINGS.partyTracker },
      equipmentTracker: { ...DEFAULT_SETTINGS.equipmentTracker }
    }
  });

  // Defaults for Pokemon actors
  game.settings.register(MODULE_ID, "defaultsPokemon", {
    name: game.i18n.localize(`${MODULE_ID}.settings.defaultsPokemon.name`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.defaultsPokemon.hint`),
    scope: "world",
    config: false,
    type: Object,
    default: {
      partyTracker: { ...DEFAULT_SETTINGS.partyTracker, enabled: false },
      equipmentTracker: { ...DEFAULT_SETTINGS.equipmentTracker }
    }
  });

  // Icon customization (global)
  game.settings.register(MODULE_ID, "icons", {
    scope: "world",
    config: false,
    type: Object,
    default: DEFAULT_SETTINGS.icons
  });

  // Modifier settings (global)
  game.settings.register(MODULE_ID, "modifiers", {
    scope: "world",
    config: false,
    type: Object,
    default: DEFAULT_SETTINGS.modifiers
  });

  console.log(`${MODULE_ID} | Settings registered`);
}

export function getSetting(key) {
  return game.settings.get(MODULE_ID, key);
}

export function setSetting(key, value) {
  return game.settings.set(MODULE_ID, key, value);
}

/**
 * Get settings for a specific token, merging defaults with token-specific overrides
 * @param {Token} token - The token to get settings for
 * @param {string} tracker - "partyTracker" or "equipmentTracker"
 * @returns {Object} Merged settings
 */
export function getTokenSettings(token, tracker = "partyTracker") {
  // Check for preview settings first (real-time preview in token config)
  const tokenDoc = token.document || token;
  const tokenId = tokenDoc.id || token.id;
  const preview = previewSettings.get(tokenId);
  console.log(`${MODULE_ID} | getTokenSettings: tokenId=${tokenId}, hasPreview=${!!preview}, previewKeys=${preview ? Object.keys(preview) : 'none'}, allPreviewIds=[${Array.from(previewSettings.keys())}]`);
  if (preview && preview[tracker]) {
    console.log(`${MODULE_ID} | Using preview settings for ${tracker}`);
    return preview[tracker];
  }

  // Get actor type for default lookup
  const actorType = token.actor?.type || "humanoid";
  const settingKey = actorType === "pokemon" ? "defaultsPokemon" : "defaultsHumanoid";

  // Layer 1: Global defaults
  const globalDefaults = { ...DEFAULT_SETTINGS[tracker] };

  // Layer 2: Actor type defaults
  let typeDefaults = {};
  try {
    const savedDefaults = getSetting(settingKey);
    typeDefaults = savedDefaults?.[tracker] || {};
  } catch (e) {
    // Settings not ready yet
  }

  // Layer 3: Token-specific flags
  const tokenFlags = tokenDoc.getFlag?.(MODULE_ID, tracker) || {};

  // Merge all layers
  return foundry.utils.mergeObject(
    foundry.utils.mergeObject(globalDefaults, typeDefaults),
    tokenFlags
  );
}

/**
 * Get party tracker settings for a token
 * @param {Token} token - The token
 * @returns {Object} Party tracker settings
 */
export function getPartyTrackerSettings(token) {
  return getTokenSettings(token, "partyTracker");
}

/**
 * Get equipment tracker settings for a token
 * @param {Token} token - The token
 * @returns {Object} Equipment tracker settings
 */
export function getEquipmentTrackerSettings(token) {
  return getTokenSettings(token, "equipmentTracker");
}

/**
 * Save settings to a token's flags
 * @param {TokenDocument} tokenDoc - The token document
 * @param {string} tracker - "partyTracker" or "equipmentTracker"
 * @param {Object} settings - Settings to save
 */
export async function setTokenSettings(tokenDoc, tracker, settings) {
  await tokenDoc.setFlag(MODULE_ID, tracker, settings);
}

/**
 * Clear token-specific settings (revert to defaults)
 * @param {TokenDocument} tokenDoc - The token document
 * @param {string} tracker - "partyTracker" or "equipmentTracker"
 */
export async function clearTokenSettings(tokenDoc, tracker) {
  await tokenDoc.unsetFlag(MODULE_ID, tracker);
}

/**
 * Save current token settings as defaults for an actor type
 * @param {string} actorType - "humanoid" or "pokemon"
 * @param {Object} settings - Full settings object with partyTracker and equipmentTracker
 */
export async function saveAsTypeDefaults(actorType, settings) {
  const settingKey = actorType === "pokemon" ? "defaultsPokemon" : "defaultsHumanoid";
  await setSetting(settingKey, settings);
}

/**
 * Set preview settings for a token (real-time preview in config)
 * @param {string} tokenId - The token ID
 * @param {Object} settings - Preview settings object
 */
export function setPreviewSettings(tokenId, settings) {
  console.log(`${MODULE_ID} | setPreviewSettings: tokenId=${tokenId}, enabled=${settings?.partyTracker?.enabled}`);
  previewSettings.set(tokenId, settings);
}

/**
 * Clear preview settings for a token
 * @param {string} tokenId - The token ID
 */
export function clearPreviewSettings(tokenId) {
  console.log(`${MODULE_ID} | clearPreviewSettings: tokenId=${tokenId}`);
  previewSettings.delete(tokenId);
}

/**
 * Get preview settings for a token if they exist
 * @param {string} tokenId - The token ID
 * @returns {Object|null} Preview settings or null
 */
export function getPreviewSettings(tokenId) {
  return previewSettings.get(tokenId) || null;
}

export { MODULE_ID };
