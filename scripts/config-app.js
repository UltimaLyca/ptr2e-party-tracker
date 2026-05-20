/**
 * TrackerConfigApp - Configuration window for party and equipment trackers
 */

import {
  getSetting,
  setSetting,
  getPartyTrackerSettings,
  getEquipmentTrackerSettings,
  POSITIONS,
  DIRECTIONS,
  VISIBILITY
} from "./settings.js";

const MODULE_ID = "ptr2e-party-tracker";

export class TrackerConfigApp extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: `${MODULE_ID}-config`,
      title: game.i18n.localize(`${MODULE_ID}.config.title`) || "Party Tracker Configuration",
      template: `modules/${MODULE_ID}/templates/config.hbs`,
      classes: ["ptr2e-party-tracker-config"],
      width: 500,
      height: "auto",
      tabs: [{ navSelector: ".tabs", contentSelector: ".tab-content", initial: "party" }],
      closeOnSubmit: false,
      submitOnChange: true
    });
  }

  getData() {
    const partySettings = getPartyTrackerSettings();
    const equipSettings = getEquipmentTrackerSettings();

    return {
      party: partySettings,
      equipment: equipSettings,
      partyCap: getSetting("partyCap"),
      positions: Object.entries(POSITIONS).map(([key, value]) => ({
        value,
        label: game.i18n.localize(`${MODULE_ID}.positions.${value}`)
      })),
      directions: Object.entries(DIRECTIONS).map(([key, value]) => ({
        value,
        label: game.i18n.localize(`${MODULE_ID}.directions.${value}`)
      })),
      visibility: Object.entries(VISIBILITY).map(([key, value]) => ({
        value,
        label: game.i18n.localize(`${MODULE_ID}.visibility.${value}`)
      }))
    };
  }

  async _updateObject(event, formData) {
    const expanded = foundry.utils.expandObject(formData);

    if (expanded.party) {
      for (const [key, value] of Object.entries(expanded.party)) {
        const settingKey = `partyTracker${key.charAt(0).toUpperCase() + key.slice(1)}`;
        await setSetting(settingKey, value);
      }
    }

    if (expanded.equipment) {
      for (const [key, value] of Object.entries(expanded.equipment)) {
        const settingKey = `equipmentTracker${key.charAt(0).toUpperCase() + key.slice(1)}`;
        await setSetting(settingKey, value);
      }
    }

    if (expanded.partyCap !== undefined) {
      await setSetting("partyCap", expanded.partyCap);
    }

    this.render();
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".icon-picker-btn").on("click", this._onIconPicker.bind(this));
    html.find(".reset-defaults").on("click", this._onResetDefaults.bind(this));
  }

  async _onIconPicker(event) {
    event.preventDefault();
    const target = event.currentTarget.dataset.target;

    const { IconPickerApp } = await import("./icon-picker.js");
    new IconPickerApp(target, (selectedPath) => {
      this._updateIcon(target, selectedPath);
    }).render(true);
  }

  async _updateIcon(target, path) {
    const icons = getSetting("icons");
    icons[target] = path;
    await setSetting("icons", icons);
    this.render();
  }

  async _onResetDefaults(event) {
    event.preventDefault();

    const confirmed = await Dialog.confirm({
      title: game.i18n.localize(`${MODULE_ID}.config.resetTitle`) || "Reset to Defaults",
      content: game.i18n.localize(`${MODULE_ID}.config.resetContent`) || "Reset all settings to defaults?"
    });

    if (!confirmed) return;

    const { DEFAULT_SETTINGS } = await import("./settings.js");

    for (const [key, value] of Object.entries(DEFAULT_SETTINGS.partyTracker)) {
      const settingKey = `partyTracker${key.charAt(0).toUpperCase() + key.slice(1)}`;
      try {
        await setSetting(settingKey, value);
      } catch (e) {
        console.warn(`${MODULE_ID} | Failed to reset ${settingKey}`);
      }
    }

    for (const [key, value] of Object.entries(DEFAULT_SETTINGS.equipmentTracker)) {
      const settingKey = `equipmentTracker${key.charAt(0).toUpperCase() + key.slice(1)}`;
      try {
        await setSetting(settingKey, value);
      } catch (e) {
        console.warn(`${MODULE_ID} | Failed to reset ${settingKey}`);
      }
    }

    await setSetting("partyCap", DEFAULT_SETTINGS.partyCap);
    await setSetting("icons", DEFAULT_SETTINGS.icons);
    await setSetting("modifiers", DEFAULT_SETTINGS.modifiers);

    ui.notifications.info(game.i18n.localize(`${MODULE_ID}.config.resetSuccess`) || "Settings reset to defaults");
    this.render();
  }
}

export function registerConfigButton() {
  Hooks.on("getSceneControlButtons", (controls) => {
    // Foundry v14+ uses an array, but check for both formats
    const controlsArray = Array.isArray(controls) ? controls : Object.values(controls);
    const tokenControls = controlsArray.find(c => c.name === "token");
    if (tokenControls && tokenControls.tools) {
      const toolsArray = Array.isArray(tokenControls.tools) ? tokenControls.tools : [];
      toolsArray.push({
        name: MODULE_ID,
        title: game.i18n.localize(`${MODULE_ID}.controls.config`) || "Party Tracker Settings",
        icon: "fas fa-circle-notch",
        button: true,
        onClick: () => {
          new TrackerConfigApp().render(true);
        }
      });
    }
  });
}

export function registerTokenHUD() {
  Hooks.on("renderTokenHUD", (hud, html, data) => {
    const token = hud.object;
    if (!token?.actor?.party?.party) return;

    const button = document.createElement("div");
    button.className = "control-icon";
    button.dataset.action = `${MODULE_ID}-toggle`;
    button.title = "Party Tracker Settings";
    button.innerHTML = '<i class="fas fa-circle-notch"></i>';

    button.addEventListener("click", (event) => {
      event.preventDefault();
      const configApp = new TrackerConfigApp();
      configApp.render(true);
    });

    // Foundry v14 uses native HTMLElement, not jQuery
    const leftCol = html.querySelector?.(".col.left") || html.find?.(".col.left")?.[0];
    if (leftCol) {
      leftCol.appendChild(button);
    }
  });
}
