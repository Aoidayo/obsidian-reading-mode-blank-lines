# Blank Line Height Setting Design

## Goal

Remove the obsolete manual refresh UI and add a persistent Obsidian setting that controls the rendered height of each eligible Markdown blank line.

## Behavior

- Reading mode refresh remains automatic through the existing editor-change and layout lifecycle.
- The ribbon refresh icon and manual refresh command are removed.
- The plugin settings page exposes a slider named `Blank line height`.
- The slider stores a multiplier from `0.5` to `3.0`, with `0.1` increments and a default of `1.0`.
- A blank line's height is the current rendered block line height multiplied by the configured multiplier.
- Changing the setting persists it and rerenders the active Reading mode view immediately.

## Architecture

The plugin owns a small settings object loaded with `loadData()` and saved with `saveData()`. The renderer receives the multiplier as an explicit argument so its pure length calculation remains testable and does not depend on Obsidian state. The settings tab is responsible only for editing and saving the value, then requesting a rerender through the plugin callback.

## Verification

- Unit tests cover multiplier calculation, default and boundary normalization, and the existing refresh behavior.
- TypeScript compilation and production bundling must pass.
- The built files are copied to `/Users/aoi/Documents/Rec/.obsidian/plugins/reading-mode-blank-lines`.
