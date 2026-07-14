# Blank Line Height Setting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove manual refresh controls and add a persistent slider for the rendered height of Markdown blank lines.

**Architecture:** Keep automatic view refresh in `main.ts`, move the setting shape and normalization into a small pure module, and pass the configured multiplier into renderer length calculation. Add an Obsidian `PluginSettingTab` that saves values and asks the plugin to rerender the active Reading view.

**Tech Stack:** TypeScript, Obsidian Plugin API, esbuild, Node assertion tests.

## Global Constraints

- Reading mode only.
- Slider range is `0.5` to `3.0`, step `0.1`, default `1.0`.
- Existing blank-line eligibility and automatic refresh behavior remain unchanged.
- Production output must be synced to `/Users/aoi/Documents/Rec/.obsidian/plugins/reading-mode-blank-lines`.

---

### Task 1: Add the setting model and renderer multiplier

**Files:**
- Create: `src/blank-line-settings.ts`
- Modify: `src/reading-mode-renderer.ts`
- Test: `tests/reading-mode-renderer.test.mjs`

**Interfaces:**
- `DEFAULT_SETTINGS`, `MIN_BLANK_LINE_HEIGHT`, `MAX_BLANK_LINE_HEIGHT`, and `BLANK_LINE_HEIGHT_STEP` are exported constants.
- `normalizeBlankLineHeight(value: unknown): number` clamps invalid values to the default and valid values to the slider range.
- `formatBlankLineLength(count: number, lineHeight: string, multiplier?: number): string` multiplies computed pixel line height by the configured multiplier.

- [ ] **Step 1: Write the failing tests** for default normalization, lower/upper clamping, and `formatBlankLineLength(2, '20px', 1.5) === '60px'`.
- [ ] **Step 2: Run the renderer test and verify it fails because the setting API is missing.**
- [ ] **Step 3: Implement the constants, normalization, and optional multiplier plumbing through block and internal spacer rendering.**
- [ ] **Step 4: Run the renderer and analysis tests and verify they pass.**
- [ ] **Step 5: Commit as `feat: add blank line height setting model`.**

### Task 2: Add settings UI and remove manual refresh controls

**Files:**
- Modify: `main.ts`
- Modify: `package.json`
- Test: `tests/reading-mode-settings.test.mjs`

**Interfaces:**
- `ReadingModeBlankLinesSettings` contains `blankLineHeight: number`.
- `ReadingModeBlankLinesPlugin` loads normalized settings, passes the multiplier to `applySectionBlankLines`, and exposes `refreshActiveReadingView()` to its settings tab.

- [ ] **Step 1: Write the failing settings test** for loading a missing value as `1.0` and saving a changed value.
- [ ] **Step 2: Run the settings test and verify it fails before the settings tab exists.**
- [ ] **Step 3: Add `PluginSettingTab` with a slider from `0.5` to `3.0`, step `0.1`, and visible current value; save changes and rerender the active preview.**
- [ ] **Step 4: Remove `addRibbonIcon`, the manual refresh command, and their helper methods; register the settings tab and use the setting in postprocessing.**
- [ ] **Step 5: Run all tests, TypeScript compilation, and production build.**
- [ ] **Step 6: Copy `main.js`, `manifest.json`, `styles.css`, and `versions.json` to the vault plugin directory.**
- [ ] **Step 7: Commit as `feat: add blank line height setting`.**
