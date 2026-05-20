# PTR2e Party Tracker v2.0.0

A visual party tracker for PTR2e that displays Pokemon status, equipment, and belt items as customizable icon bars on tokens.

## Features

### Party Status Tracker
- Visual pokeball row showing each party slot (healthy, afflicted, fainted, or empty)
- Major affliction indicators with color tints and badge overlays:
  - Poisoned (purple tint + badge)
  - Badly Poisoned (dark purple tint + badge)
  - Burned (red tint + badge)
  - Paralyzed (yellow tint + badge)
  - Frozen (blue tint + badge)
  - Asleep (dark tint + badge)
- Uses PTR2e's native condition icons for badges
- Multiple afflictions spread around the pokeball icon
- Option to display Pokemon sprites instead of pokeball icons
- Scales with configurable party cap (default 6)

### Equipment/Belt Tracker
- Separate icon row for equipped items and belt items
- Shows item icons with stack counts
- Belt items displayed first (configurable)
- Maximum item display limit

### Customization
- Position: top, bottom, left, or right of token
- Offset X/Y adjustments
- Icon size and spacing
- Horizontal or vertical layout
- Custom icons via file picker

### Visibility Options
- Always visible
- On hover only
- Owner only
- Owner + hover for others
- GM only
- When controlled
- Hidden

## Installation

1. In Foundry VTT, go to **Add-on Modules** > **Install Module**
2. Paste this manifest URL:
   ```
   https://github.com/UltimaLyca/ptr2e-party-tracker/releases/latest/download/module.json
   ```
3. Click **Install**
4. Enable the module in your world

## Configuration

### Module Settings
Access via **Settings** > **Module Settings** > **PTR2e Party Tracker**, or click the pokeball icon in the token controls.

### Token HUD
Right-click a trainer token to access quick configuration.

## Compatibility

- **Foundry VTT:** v14+
- **System:** PTR2e
- **Dependencies:** None - fully standalone module

## Migration from v1.x

Version 2.0.0 is a complete rewrite:
- No dependencies required (Bar Brawl no longer needed)
- New canvas overlay rendering system
- Per-token configuration via token settings
- Uses PTR2e's native condition icons

**Migration:** Clean install recommended. v1.x settings will not carry over.

## License

MIT
