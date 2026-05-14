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

## Usage

1. Select a trainer token and open the token configuration
2. Set a bar attribute to `partyStats.active`
3. The bar will display the count of party Pokemon with HP > 0

Works with [Bar Brawl](https://foundryvtt.com/packages/barbrawl) for custom bar styling.

## Features

- Tracks non-fainted Pokemon count (HP > 0) in trainer's party
- Auto-updates when party Pokemon HP changes
- Max value set to 6 (standard party size)

## Compatibility

- Foundry VTT v14+
- PTR2e system
