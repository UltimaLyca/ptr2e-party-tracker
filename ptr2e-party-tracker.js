// PTR2e Party Tracker Module v1.0.1
// Adds partyStats.active bar attribute to track non-fainted Pokemon in party

const MODULE_ID = "ptr2e-party-tracker";
const MODULE_VERSION = "1.0.1";

console.log(`${MODULE_ID} | Script loaded (v${MODULE_VERSION})`);

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing v${MODULE_VERSION}`);
});

Hooks.once("setup", () => {
  console.log(`${MODULE_ID} | Setup starting v${MODULE_VERSION}`);

  // Override getBarAttribute on TokenDocument to handle partyStats.active
  const TokenDocClass = CONFIG.Token.documentClass;
  console.log(`${MODULE_ID} | TokenDocument class:`, TokenDocClass.name);

  const originalGetBarAttribute = TokenDocClass.prototype.getBarAttribute;

  TokenDocClass.prototype.getBarAttribute = function(barName, options = {}) {
    const attribute = options.alternative || this[barName]?.attribute;

    if (attribute === "partyStats.active") {
      const actor = this.actor;
      console.log(`${MODULE_ID} | getBarAttribute called for partyStats.active`);
      console.log(`${MODULE_ID} | Actor:`, actor?.name, actor?.id);

      if (!actor) {
        console.log(`${MODULE_ID} | No actor found`);
        return null;
      }

      let value = 0;
      let max = 6;

      try {
        const partyData = actor.party;
        console.log(`${MODULE_ID} | actor.party:`, partyData);

        if (partyData?.party) {
          // Filter out the trainer themselves from the party count
          const partyMembers = partyData.party.filter(p => p !== actor && p.id !== actor.id);
          console.log(`${MODULE_ID} | Party members:`, partyMembers.map(p => ({name: p.name, hp: p.system?.health?.value})));
          value = partyMembers.filter(p => p.system?.health?.value > 0).length;
          console.log(`${MODULE_ID} | Non-fainted count: ${value}/${max}`);
        } else {
          console.log(`${MODULE_ID} | No party data found`);
        }
      } catch (e) {
        console.warn(`${MODULE_ID} | Error calculating party stats:`, e);
      }

      return {
        type: "bar",
        attribute: "partyStats.active",
        value: value,
        max: max,
        editable: false
      };
    }

    return originalGetBarAttribute.call(this, barName, options);
  };

  console.log(`${MODULE_ID} | getBarAttribute patched v${MODULE_VERSION}`);
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Ready v${MODULE_VERSION}`);

  // Add partyStats.active to trackable attributes for the dropdown
  if (CONFIG.Actor.trackableAttributes?.humanoid?.bar) {
    if (!CONFIG.Actor.trackableAttributes.humanoid.bar.includes("partyStats.active")) {
      CONFIG.Actor.trackableAttributes.humanoid.bar.push("partyStats.active");
      console.log(`${MODULE_ID} | Added partyStats.active to trackable attributes`);
    }
  } else {
    console.warn(`${MODULE_ID} | Could not find CONFIG.Actor.trackableAttributes.humanoid.bar`);
  }
});

// Refresh trainer tokens when party Pokemon HP changes
Hooks.on("updateActor", (actor, changes, options, userId) => {
  if (changes.system?.health?.value !== undefined) {
    console.log(`${MODULE_ID} | HP changed for ${actor.name}`);
    const partyMemberOf = actor.system?.party?.partyMemberOf;
    if (partyMemberOf) {
      const folder = game.folders.get(partyMemberOf);
      if (folder) {
        const owner = folder.contents?.find(a => a.system?.party?.ownerOf === partyMemberOf);
        if (owner) {
          console.log(`${MODULE_ID} | Refreshing tokens for owner ${owner.name}`);
          for (const token of owner.getActiveTokens()) {
            token.drawBars();
          }
        }
      }
    }
  }
});
