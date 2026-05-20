/**
 * PTR2e Party Tracker v2.0.0
 * A visual party tracker for PTR2e that displays Pokemon status,
 * equipment, and belt items as customizable icon bars on tokens.
 */

import { registerSettings } from "./scripts/settings.js";
import { TrackerRenderer } from "./scripts/tracker.js";
import { registerConfigButton } from "./scripts/config-app.js";
import { registerTokenConfig } from "./scripts/token-config.js";

const MODULE_ID = "ptr2e-party-tracker";
const MODULE_VERSION = "2.0.0";

let trackerRenderer = null;

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing v${MODULE_VERSION}`);
  registerSettings();
});

Hooks.once("setup", () => {
  console.log(`${MODULE_ID} | Setup v${MODULE_VERSION}`);
  registerConfigButton();
  registerTokenConfig();
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Ready v${MODULE_VERSION}`);

  if (game.system.id !== "ptr2e") {
    console.warn(`${MODULE_ID} | This module is designed for the PTR2e system`);
  }

  trackerRenderer = new TrackerRenderer();
  trackerRenderer.initialize();

  // Expose globally for token-config real-time preview
  window.trackerRenderer = trackerRenderer;
});

Hooks.on("canvasReady", () => {
  if (trackerRenderer) {
    trackerRenderer.refresh();
  }
});

Hooks.on("refreshToken", (token) => {
  if (trackerRenderer) {
    trackerRenderer.refreshToken(token);
  }
});

Hooks.on("updateToken", (tokenDoc, changes, options, userId) => {
  if (trackerRenderer) {
    const token = tokenDoc.object;
    if (token) {
      trackerRenderer.refreshToken(token);
    }
  }
});

Hooks.on("updateActor", (actor, changes, options, userId) => {
  if (trackerRenderer) {
    trackerRenderer.refreshActorTokens(actor);
  }
});

Hooks.on("createItem", (item, options, userId) => {
  if (trackerRenderer && item.parent) {
    trackerRenderer.refreshActorTokens(item.parent);
  }
});

Hooks.on("updateItem", (item, changes, options, userId) => {
  if (trackerRenderer && item.parent) {
    trackerRenderer.refreshActorTokens(item.parent);
  }
});

Hooks.on("deleteItem", (item, options, userId) => {
  if (trackerRenderer && item.parent) {
    trackerRenderer.refreshActorTokens(item.parent);
  }
});

Hooks.on("hoverToken", (token, hovered) => {
  if (trackerRenderer) {
    trackerRenderer.onTokenHover(token, hovered);
  }
});

Hooks.on("controlToken", (token, controlled) => {
  if (trackerRenderer) {
    trackerRenderer.onTokenControl(token, controlled);
  }
});

Hooks.on("updateSetting", (setting) => {
  if (setting.key.startsWith(MODULE_ID) && trackerRenderer) {
    trackerRenderer.refresh();
  }
});

export { MODULE_ID, MODULE_VERSION, trackerRenderer };
