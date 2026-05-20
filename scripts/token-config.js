/**
 * Token Configuration Extension for Party Tracker
 * Adds a "Party Tracker" tab to the token configuration window
 */

console.log("=== PTR2E PARTY TRACKER TOKEN-CONFIG.JS LOADED v2.0.2 ===");

import {
  MODULE_ID,
  DEFAULT_SETTINGS,
  POSITIONS,
  DIRECTIONS,
  VISIBILITY,
  getTokenSettings,
  setTokenSettings,
  clearTokenSettings,
  saveAsTypeDefaults,
  getSetting,
  setPreviewSettings,
  clearPreviewSettings
} from "./settings.js";

/**
 * Register the token config hook
 */
export function registerTokenConfig() {
  // Foundry v14 uses renderTokenApplication for ApplicationV2
  Hooks.on("renderTokenConfig", onRenderTokenConfig);
  Hooks.on("renderTokenApplication", onRenderTokenConfig);
}

/**
 * Handle renderTokenConfig hook - inject our custom tab
 */
async function onRenderTokenConfig(app, html, data) {
  console.log(`${MODULE_ID} | renderTokenConfig hook fired`);

  // Foundry v14 uses app.document for the TokenDocument
  const token = app.document ?? app.token ?? app.object ?? data?.document;
  if (!token) {
    console.warn(`${MODULE_ID} | No token found on app`);
    return;
  }

  console.log(`${MODULE_ID} | Token found:`, token.id, token.name);

  // Get current settings for this token
  const partySettings = getTokenSettings(token, "partyTracker");
  const equipSettings = getTokenSettings(token, "equipmentTracker");
  const actorType = token.actor?.type || "humanoid";

  // SET PREVIEW SETTINGS IMMEDIATELY - before any async operations
  // This prevents icons from disappearing during template rendering
  setPreviewSettings(token.id, {
    partyTracker: partySettings,
    equipmentTracker: equipSettings
  });
  console.log(`${MODULE_ID} | Preview settings set at hook start (before await)`);

  // Prepare template data
  const templateData = {
    partyTracker: partySettings,
    equipmentTracker: equipSettings,
    actorType,
    positions: Object.values(POSITIONS).map(p => ({
      value: p,
      label: game.i18n.localize(`${MODULE_ID}.positions.${p}`)
    })),
    directions: Object.values(DIRECTIONS).map(d => ({
      value: d,
      label: game.i18n.localize(`${MODULE_ID}.directions.${d}`)
    })),
    visibility: Object.values(VISIBILITY).map(v => ({
      value: v,
      label: game.i18n.localize(`${MODULE_ID}.visibility.${v}`)
    }))
  };

  // Render our template (use namespaced version for Foundry v14)
  const renderFn = foundry.applications?.handlebars?.renderTemplate ?? renderTemplate;
  const template = await renderFn(
    `modules/${MODULE_ID}/templates/token-config.hbs`,
    templateData
  );

  // Foundry v14: html is an HTMLElement, not jQuery
  const element = html instanceof HTMLElement ? html : html[0];

  // Find the nav and existing tab content area
  const nav = element.querySelector("nav.sheet-tabs");
  const existingTab = element.querySelector("div.tab[data-group='sheet']");

  if (!nav || !existingTab) {
    console.warn(`${MODULE_ID} | Could not find token config nav/tab areas`);
    return;
  }

  // Get the parent container for tabs (sibling of nav)
  const tabParent = existingTab.parentElement;

  // Check if we already added our tab (avoid duplicates on re-render)
  let tabButton = nav.querySelector('[data-tab="party-tracker"]');
  let tabContent = tabParent.querySelector('.tab[data-tab="party-tracker"]');

  if (!tabButton) {
    // Add our tab button
    tabButton = document.createElement("a");
    tabButton.className = "item";
    tabButton.dataset.tab = "party-tracker";
    tabButton.dataset.group = "sheet";
    tabButton.innerHTML = `<i class="fas fa-circle-notch"></i> ${game.i18n.localize(`${MODULE_ID}.tokenConfig.tabName`)}`;
    nav.appendChild(tabButton);
  }

  if (!tabContent) {
    // Add our tab content
    tabContent = document.createElement("div");
    tabContent.className = "tab scrollable";
    tabContent.dataset.tab = "party-tracker";
    tabContent.dataset.group = "sheet";
    tabParent.appendChild(tabContent);
  }

  // Always update the content (in case settings changed)
  tabContent.innerHTML = template;
  // Store token ID directly on the element as a data attribute (survives re-renders)
  tabContent.dataset.tokenId = token.id;

  // Manual tab switching since Foundry doesn't know about our new tab
  tabButton.addEventListener("click", (e) => {
    e.preventDefault();

    // Remove active from all nav items and tabs
    nav.querySelectorAll(".item").forEach(item => item.classList.remove("active"));
    tabParent.querySelectorAll(".tab[data-group='sheet']").forEach(tab => tab.classList.remove("active"));

    // Activate our tab
    tabButton.classList.add("active");
    tabContent.classList.add("active");
  });

  // Activate listeners for our content
  activateListeners(tabContent, app, token);

  // Resize the window to fit new content
  app.setPosition({ height: "auto" });
}

/**
 * Activate event listeners for our tab content
 */
function activateListeners(tabContent, app, token) {
  console.log(`${MODULE_ID} | activateListeners called with token:`, token, "id:", token?.id);

  // Internal tab switching (party/equipment tabs within our main tab)
  const innerNav = tabContent.querySelector("nav.sheet-tabs[data-group='tracker-tabs']");
  const innerTabContent = tabContent.querySelector(".tab-content");

  if (innerNav && innerTabContent) {
    innerNav.querySelectorAll(".item").forEach(navItem => {
      navItem.addEventListener("click", (e) => {
        e.preventDefault();
        const targetTab = navItem.dataset.tab;

        // Remove active from all nav items and inner tabs
        innerNav.querySelectorAll(".item").forEach(item => item.classList.remove("active"));
        innerTabContent.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));

        // Activate clicked tab
        navItem.classList.add("active");
        const targetContent = innerTabContent.querySelector(`.tab[data-tab="${targetTab}"]`);
        if (targetContent) targetContent.classList.add("active");
      });
    });
  }

  // Reset to defaults buttons
  tabContent.querySelectorAll(".reset-defaults").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const tracker = btn.dataset.tracker;
      // token is already a TokenDocument in Foundry v14
      await clearTokenSettings(token, tracker);
      app.render();
    });
  });

  // Save as type defaults buttons
  tabContent.querySelectorAll(".save-type-defaults").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const actorType = token.actor?.type || "humanoid";

      // Gather current form values
      const partySettings = gatherFormSettings(tabContent, "partyTracker");
      const equipSettings = gatherFormSettings(tabContent, "equipmentTracker");

      await saveAsTypeDefaults(actorType, {
        partyTracker: partySettings,
        equipmentTracker: equipSettings
      });

      ui.notifications.info(game.i18n.format(`${MODULE_ID}.tokenConfig.savedAsDefaults`, { type: actorType }));
    });
  });

  // Store token ID for preUpdateToken hook (ID is stable, object reference may not be)
  tabContent._tokenId = token.id;
  console.log(`${MODULE_ID} | Stored token ID on tabContent:`, token.id);

  // Real-time preview: update tracker display when form values change
  const updatePreview = () => {
    const partySettings = gatherFormSettings(tabContent, "partyTracker");
    const equipSettings = gatherFormSettings(tabContent, "equipmentTracker");

    setPreviewSettings(token.id, {
      partyTracker: partySettings,
      equipmentTracker: equipSettings
    });

    // Trigger tracker refresh for this token
    const tokenPlaceable = canvas.tokens?.get(token.id);
    if (tokenPlaceable && window.trackerRenderer) {
      window.trackerRenderer.refreshToken(tokenPlaceable);
    }
  };

  // Add change listeners - only on "change" event (fires when user finishes editing)
  tabContent.querySelectorAll("input, select").forEach(input => {
    input.addEventListener("change", updatePreview);
  });

  // Set preview settings IMMEDIATELY (sync) so any subsequent refresh uses them
  const initPartySettings = gatherFormSettings(tabContent, "partyTracker");
  const initEquipSettings = gatherFormSettings(tabContent, "equipmentTracker");
  console.log(`${MODULE_ID} | Setting preview settings immediately:`, initPartySettings, initEquipSettings);
  setPreviewSettings(token.id, {
    partyTracker: initPartySettings,
    equipmentTracker: initEquipSettings
  });

  // Trigger a refresh after a short delay to ensure canvas is ready
  setTimeout(() => {
    const initTokenPlaceable = canvas.tokens?.get(token.id);
    if (initTokenPlaceable && window.trackerRenderer) {
      window.trackerRenderer.refreshToken(initTokenPlaceable);
    }
  }, 100);

  // Clean up preview settings only when app is actually closed by user
  // Listen to both v13 and v14 hook names for compatibility
  if (!app._partyTrackerCloseHooked) {
    app._partyTrackerCloseHooked = true;
    const cleanupHandler = (closedApp) => {
      if (closedApp === app) {
        clearPreviewSettings(token.id);
        const tokenPlaceable = canvas.tokens?.get(token.id);
        if (tokenPlaceable && window.trackerRenderer) {
          window.trackerRenderer.refreshToken(tokenPlaceable);
        }
      }
    };
    Hooks.once("closeTokenConfig", cleanupHandler);
    Hooks.once("closeTokenApplication", cleanupHandler);
  }
}

/**
 * Gather form settings from the tab content
 */
function gatherFormSettings(tabContent, tracker) {
  const prefix = tracker === "partyTracker" ? "party" : "equipment";
  const settings = {};

  // Boolean fields
  const booleanFields = tracker === "partyTracker"
    ? ["enabled", "useSprites"]
    : ["enabled", "showStackCount", "showBelt", "showHeld", "showWorn", "showAccessory", "showBackpack", "showStowed"];

  booleanFields.forEach(field => {
    const input = tabContent.querySelector(`[name="${prefix}.${field}"]`);
    if (input) settings[field] = input.checked;
  });

  // Select fields
  const selectFields = ["position", "direction", "visibility"];
  selectFields.forEach(field => {
    const input = tabContent.querySelector(`[name="${prefix}.${field}"]`);
    if (input) settings[field] = input.value;
  });

  // Number fields
  const numberFields = tracker === "partyTracker"
    ? ["offsetX", "offsetY", "iconSize", "spacing"]
    : ["offsetX", "offsetY", "iconSize", "spacing", "maxItems"];

  numberFields.forEach(field => {
    const input = tabContent.querySelector(`[name="${prefix}.${field}"]`);
    if (input) settings[field] = Number(input.value);
  });

  return settings;
}

/**
 * Hook into form submission to save our settings
 */
Hooks.on("preUpdateToken", (tokenDoc, changes, options, userId) => {
  // Find the token config tab for this specific token
  const tabContent = document.querySelector(`[data-tab="party-tracker"][data-token-id="${tokenDoc.id}"]`);
  if (!tabContent) {
    console.log(`${MODULE_ID} | preUpdateToken: no party-tracker tab found for token ${tokenDoc.id}`);
    return;
  }

  console.log(`${MODULE_ID} | preUpdateToken: token match! Saving settings...`);

  // Gather settings from the form
  const partySettings = gatherFormSettings(tabContent, "partyTracker");
  const equipSettings = gatherFormSettings(tabContent, "equipmentTracker");

  console.log(`${MODULE_ID} | preUpdateToken: saving settings`, partySettings, equipSettings);

  // Merge into the update
  foundry.utils.setProperty(changes, `flags.${MODULE_ID}.partyTracker`, partySettings);
  foundry.utils.setProperty(changes, `flags.${MODULE_ID}.equipmentTracker`, equipSettings);
});
