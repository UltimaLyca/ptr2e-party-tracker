---
name: ptr2e-party-tracker
version: 2.0.0
framework: foundry-vtt-module
language: javascript
styling: css
ui: canvas-overlay
storage: foundry-settings-api
auth: no
payments: none
deploy: github-releases
dependencies: none
compatibility:
  foundry: "14"
  system: "ptr2e"
  optional: ["barbrawl"]
---

# PTR2e Party Tracker — Product Requirements Document

## 1. Product Vision

**Name:** PTR2e Party Tracker

**One-liner:** A standalone visual party tracker for PTR2e that displays Pokemon status, equipment, and belt items as customizable icon bars on tokens.

**Audience:** PTR2e GMs and players who want at-a-glance party status without opening character sheets.

**Description:**
A token overlay that shows your trainer's full party state — healthy Pokemon, afflicted, fainted, and empty slots — as a row of icons (pokeballs, sprites, or custom). Also displays belt items and equipped gear with stack counts. All positioning, icons, and layout are configurable per-user or per-world.

**Compatibility:**
- Foundry VTT v14+ 
- PTR2e system (reads party/equipment data from system APIs)
- Bar Brawl (optional) — coexists without conflict, doesn't override Bar Brawl bars

**Brand personality:** Clean utility that enhances immersion. Informative without being cluttered. Respects the PTR2e aesthetic.

---

## 2. System Architecture

### UI Surfaces

| Surface | Purpose |
|---------|---------|
| Canvas Overlay | Party tracker + equipment tracker drawn on tokens |
| Module Settings | World/client defaults via Foundry settings menu |
| Tracker Config Window | Detailed config for positions, icons, visibility |
| Token HUD Addition | Quick toggle/config access from token right-click |
| Icon Picker Dialog | Browse/upload custom icons or select Pokemon sprites |

### Visual Layout

**Token with both trackers (default positions):**
```
        ╭─────────────────────╮
        │ ⚪ ⚪ 🔴 ⚪ ⚫ ⚫ │  ← Party Tracker (top)
        ├─────────────────────┤    (OK, OK, Fainted, OK, Empty, Empty)
        │                     │
        │      [TOKEN]        │
        │                     │
        ├─────────────────────┤
        │ 🧴×3  💊×1  🔧×2  │  ← Equipment Tracker (bottom)
        ╰─────────────────────╯    (Belt items with stack counts)
```

### File Structure

```
ptr2e-party-tracker/
├── module.json
├── ptr2e-party-tracker.js      # Entry point, hooks
├── scripts/
│   ├── tracker.js              # Core tracker rendering
│   ├── party-tracker.js        # Party status logic
│   ├── equipment-tracker.js    # Belt/equipment logic  
│   ├── settings.js             # Settings registration
│   ├── config-app.js           # Config window (Application v2)
│   └── icon-picker.js          # Icon selection dialog
├── styles/
│   └── tracker.css             # Config window styles
├── icons/
│   ├── pokeball-ok.svg
│   ├── pokeball-empty.svg
│   ├── pokeball-fainted.svg
│   └── modifiers/
│       ├── poison.svg
│       ├── burn.svg
│       ├── paralysis.svg
│       ├── frozen.svg
│       ├── sleep.svg
│       └── confused.svg
├── lang/
│   └── en.json                 # i18n strings
└── README.md
```

---

## 3. Tech Stack

| Layer | Choice |
|-------|--------|
| Language | Plain JavaScript (ES modules) |
| UI Rendering | Canvas overlay (Bar Brawl style — draws on token layer) |
| Styling | CSS for config windows, canvas drawing for tracker |
| Data Storage | Foundry settings API (world + client scope) |
| Config UI | Foundry Application v2 for settings dialogs |
| Build | None — direct ES modules, no transpilation |
| Distribution | GitHub Releases (zip + manifest) |

---

## 4. Core Features

### 4.1 Party Status Tracker

**Display:**
- Horizontal row of icons representing each party slot (scales with party cap)
- Base icon per slot: Pokeball (occupied) or Empty Pokeball (empty slot)
- Optional: Use Pokemon sprite as base icon instead of pokeball

**Status Modifiers (layered on base icon):**

| Status | Modifier |
|--------|----------|
| OK/Healthy | No modifier |
| Fainted | Grayscale + X overlay |
| Poisoned | Purple tint + poison icon badge |
| Burned | Orange tint + flame badge |
| Paralyzed | Yellow tint + lightning badge |
| Frozen | Blue tint + ice badge |
| Asleep | Darkened + ZZZ badge |
| Confused | Swirl badge |
| Other afflictions | Generic status badge (configurable) |

**Data source:** PTR2e `actor.party` and `actor.system.health` / `actor.system.conditions`

### 4.2 Belt/Equipment Tracker

**Display:**
- Separate icon row for belt items and equipped gear
- Shows item icon + stack count (if >1)
- Belt items shown first (priority), then other equipped

**Layout:**
- Independently positionable (same options as party tracker)
- Can be placed adjacent to party tracker or anywhere else

**Data source:** PTR2e `actor.system.equipment` / `actor.items`

### 4.3 Positioning & Layout

**Position options (per tracker):**
- Top / Bottom / Left / Right of token
- Offset X/Y from anchor point
- Icon size (scales with token size or fixed px)
- Icon spacing
- Row direction (horizontal / vertical)

**Scope:** World default + per-token override option

### 4.4 Visibility Settings

| Option | Behavior |
|--------|----------|
| Always | Visible to all |
| Hover | Shows on token hover |
| Owner | Only token owner sees |
| Owner + Hover | Owner always, others on hover |
| GM Only | Only GM sees |
| Control | Only when token is controlled |
| None | Hidden |

### 4.5 Icon Customization

**Defaults provided:**
- Pokeball (OK)
- Empty Pokeball (empty slot)
- Status modifier overlays (poison, burn, etc.)

**Custom options:**
- Upload custom base icons
- Upload custom modifier overlays
- Use Pokemon sprites from PTR2e compendium
- Color tint overrides per status

### 4.6 Configuration UI

- Foundry settings menu for world defaults
- Per-token config via token HUD or right-click menu
- Live preview in config window

---

## 5. Data Model

### Settings Schema

```javascript
{
  partyTracker: {
    enabled: true,
    position: "top",          // top, bottom, left, right
    offsetX: 0,
    offsetY: -10,
    iconSize: 24,
    spacing: 2,
    direction: "horizontal",  // horizontal, vertical
    visibility: "owner",      // always, hover, owner, ownerHover, gm, control, none
    useSprites: false,
    icons: {
      ok: "modules/ptr2e-party-tracker/icons/pokeball-ok.svg",
      empty: "modules/ptr2e-party-tracker/icons/pokeball-empty.svg",
      fainted: "modules/ptr2e-party-tracker/icons/pokeball-fainted.svg"
    }
  },
  equipmentTracker: {
    enabled: true,
    position: "bottom",
    offsetX: 0,
    offsetY: 10,
    iconSize: 20,
    spacing: 2,
    direction: "horizontal",
    visibility: "owner",
    showBeltFirst: true,
    showStackCount: true,
    maxItems: 6
  },
  modifiers: {
    poison: { tint: "#9b59b6", badge: "modules/ptr2e-party-tracker/icons/modifiers/poison.svg" },
    burn: { tint: "#e74c3c", badge: "modules/ptr2e-party-tracker/icons/modifiers/burn.svg" },
    paralysis: { tint: "#f1c40f", badge: "modules/ptr2e-party-tracker/icons/modifiers/paralysis.svg" },
    frozen: { tint: "#3498db", badge: "modules/ptr2e-party-tracker/icons/modifiers/frozen.svg" },
    sleep: { tint: "#2c3e50", badge: "modules/ptr2e-party-tracker/icons/modifiers/sleep.svg" },
    confused: { tint: null, badge: "modules/ptr2e-party-tracker/icons/modifiers/confused.svg" }
  }
}
```

---

## 6. User Flows

### Flow 1: Trainer Views Party Status
1. Trainer token is on canvas
2. Module reads `actor.party` to get party members
3. For each party slot up to party cap:
   - If empty → render empty pokeball
   - If occupied → check HP and conditions
   - Apply base icon + any status modifiers
4. Render icon row at configured position
5. On party member HP/condition change → re-render

### Flow 2: Configure Tracker Position
1. User opens Module Settings or Token Config
2. Selects position anchor (top/bottom/left/right)
3. Adjusts offset sliders
4. Preview updates in real-time
5. Save → all relevant tokens update

### Flow 3: Use Pokemon Sprites
1. User enables "Use Pokemon Sprites" in settings
2. For each party slot, module fetches sprite from PTR2e compendium
3. Sprite replaces pokeball as base icon
4. Status modifiers still overlay on sprite

### Flow 4: View Belt Items
1. Equipment tracker reads `actor.items` filtered by equipped/belt
2. Sorts belt items first, then other equipped
3. Renders item icons with stack counts
4. On inventory change → re-render

---

## 7. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Performance | Smooth with 10-30 tokens on map |
| Compatibility | Foundry v14, PTR2e latest |
| Bar Brawl | Coexists without conflict |
| Localization | i18n-ready, English default |
| Accessibility | Keyboard navigation in config windows |

---

## 8. Success Criteria

- Module loads without errors on Foundry v14 + PTR2e
- Party tracker displays correct status for all party members
- Equipment tracker shows belt/equipped items with correct counts
- All positioning options work correctly
- Visibility settings respected for all permission levels
- No conflicts with Bar Brawl when both are active
- Settings persist across sessions

---

## 9. Out of Scope (v2.0)

- Foundry package registry submission (future)
- Foundry v11/v12 backward compatibility
- Animated status effects
- Sound effects on status changes
- Integration with other Pokemon Foundry systems

---

## 10. Migration from v1.x

The v2.0 release is a complete rewrite:
- Remove Bar Brawl dependency
- Remove `partyStats.active` bar attribute approach
- New canvas overlay system
- New settings structure

**Migration path:** Clean install. v1.x settings will not carry over. Users should configure fresh in v2.0.
