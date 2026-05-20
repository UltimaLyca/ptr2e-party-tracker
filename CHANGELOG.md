# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2025-05-20

### Added
- Per-token configuration via token settings tab
- Party tracker showing Pokemon status with pokeball icons
- Equipment/belt tracker showing equipped items
- Major affliction indicators (poisoned, badly-poisoned, burned, paralyzed, frozen, asleep)
- Uses PTR2e's native condition icons for affliction badges
- Multiple afflictions spread around the pokeball icon
- Configurable visibility options (always, hover, owner, GM, control, hidden)
- Configurable positioning (top, bottom, left, right with offsets)
- Horizontal or vertical layout options
- Option to display Pokemon sprites instead of pokeball icons
- Stack count display for equipment items

### Changed
- Complete rewrite from v1.x
- No longer requires Bar Brawl dependency
- New canvas overlay rendering system using PIXI.js
- 3-tier settings hierarchy (global defaults, actor type defaults, token flags)
- Sharper icon rendering with nearest-neighbor scaling

### Removed
- Bar Brawl dependency (module is now fully standalone)

## [1.0.1] - Previous Release

- Initial release with Bar Brawl integration
