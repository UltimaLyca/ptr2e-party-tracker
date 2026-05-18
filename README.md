# PTR2e Party Tracker

A Foundry VTT module for the PTR2e system that adds a token bar attribute to track non-fainted Pokemon in a trainer's party.

## Installation

1. In Foundry VTT, go to **Add-on Modules** > **Install Module**
2. Paste this manifest URL:
   ```
   https://github.com/UltimaLyca/ptr2e-party-tracker/releases/latest/download/module.json
   ```
3. Click **Install**
4. Enable the module in your world

**Requires:** [Bar Brawl](https://foundryvtt.com/packages/barbrawl)

## Usage

1. Select a trainer token and open the token configuration
2. Set a bar attribute to `partyStats.active`
3. The bar will display the count of party Pokemon with HP > 0

## Settings

- **Party Cap** - Adjust the maximum party size for the bar display (default: 6). Found in Module Settings.

## Included Bar Images

The module includes Pokeball-themed bar images in the `images/` folder:

- `Pokeball Empty V1.webp` - Empty pokeball (background)
- `Pokeball Full V1.webp` - Filled pokeball variant 1
- `Pokeball Full V2.webp` - Filled pokeball variant 2

**Important:** These images are designed for the standard party cap of 6. Place the party tracker bar on the **left or right side** of the token - the way Bar Brawl fills the bar will not display correctly if positioned on top or bottom.

You can use custom images to create your own version or to accommodate a different party cap.

## Features

- Tracks non-fainted Pokemon count (HP > 0) in trainer's party
- Auto-updates when party Pokemon HP changes
- Configurable party cap (default: 6)

## Compatibility

- Foundry VTT v14+
- PTR2e system
- Bar Brawl (required)
