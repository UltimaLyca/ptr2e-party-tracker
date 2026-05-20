/**
 * IconPickerApp - Dialog for selecting tracker icons
 */

import { getSetting, DEFAULT_SETTINGS } from "./settings.js";

const MODULE_ID = "ptr2e-party-tracker";

export class IconPickerApp extends Application {
  constructor(target, callback) {
    super();
    this.target = target;
    this.callback = callback;
    this.selectedPath = null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: `${MODULE_ID}-icon-picker`,
      title: game.i18n.localize(`${MODULE_ID}.iconPicker.title`) || "Select Icon",
      template: `modules/${MODULE_ID}/templates/icon-picker.hbs`,
      classes: ["ptr2e-party-tracker-icon-picker"],
      width: 400,
      height: 500,
      resizable: true
    });
  }

  getData() {
    const icons = getSetting("icons");
    const currentIcon = icons[this.target] || DEFAULT_SETTINGS.icons[this.target];

    const defaultIcons = [
      { path: DEFAULT_SETTINGS.icons.ok, label: "Pokeball (OK)" },
      { path: DEFAULT_SETTINGS.icons.empty, label: "Pokeball (Empty)" },
      { path: DEFAULT_SETTINGS.icons.fainted, label: "Pokeball (Fainted)" }
    ];

    return {
      target: this.target,
      currentIcon,
      defaultIcons,
      customPath: ""
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".icon-option").on("click", this._onSelectIcon.bind(this));
    html.find(".browse-btn").on("click", this._onBrowse.bind(this));
    html.find(".custom-path-input").on("change", this._onCustomPath.bind(this));
    html.find(".confirm-btn").on("click", this._onConfirm.bind(this));
    html.find(".cancel-btn").on("click", () => this.close());
  }

  _onSelectIcon(event) {
    event.preventDefault();
    const path = event.currentTarget.dataset.path;
    this.selectedPath = path;

    this.element.find(".icon-option").removeClass("selected");
    $(event.currentTarget).addClass("selected");
  }

  async _onBrowse(event) {
    event.preventDefault();

    const picker = new FilePicker({
      type: "image",
      current: this.selectedPath || "",
      callback: (path) => {
        this.selectedPath = path;
        this.element.find(".custom-path-input").val(path);
        this.element.find(".icon-option").removeClass("selected");
      }
    });

    picker.render(true);
  }

  _onCustomPath(event) {
    const path = event.currentTarget.value;
    if (path) {
      this.selectedPath = path;
      this.element.find(".icon-option").removeClass("selected");
    }
  }

  _onConfirm(event) {
    event.preventDefault();

    if (this.selectedPath && this.callback) {
      this.callback(this.selectedPath);
    }

    this.close();
  }
}

export class ModifierPickerApp extends Application {
  constructor(condition, callback) {
    super();
    this.condition = condition;
    this.callback = callback;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: `${MODULE_ID}-modifier-picker`,
      title: game.i18n.localize(`${MODULE_ID}.modifierPicker.title`) || "Edit Status Modifier",
      template: `modules/${MODULE_ID}/templates/modifier-picker.hbs`,
      classes: ["ptr2e-party-tracker-modifier-picker"],
      width: 350,
      height: "auto"
    });
  }

  getData() {
    const modifiers = getSetting("modifiers");
    const modifier = modifiers[this.condition] || {};

    return {
      condition: this.condition,
      tint: modifier.tint || "",
      badge: modifier.badge || ""
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".browse-badge").on("click", this._onBrowseBadge.bind(this));
    html.find(".save-btn").on("click", this._onSave.bind(this));
    html.find(".cancel-btn").on("click", () => this.close());
  }

  async _onBrowseBadge(event) {
    event.preventDefault();

    const picker = new FilePicker({
      type: "image",
      current: this.element.find(".badge-input").val() || "",
      callback: (path) => {
        this.element.find(".badge-input").val(path);
      }
    });

    picker.render(true);
  }

  async _onSave(event) {
    event.preventDefault();

    const tint = this.element.find(".tint-input").val() || null;
    const badge = this.element.find(".badge-input").val() || null;

    if (this.callback) {
      this.callback({ tint, badge });
    }

    this.close();
  }
}
