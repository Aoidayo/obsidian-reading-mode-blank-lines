# Reading Mode Blank Lines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Reading mode rendering that preserves eligible Markdown source blank lines as exact visual blank lines.

**Architecture:** Put source parsing in pure TypeScript functions, keep DOM mutation in a focused renderer module, and wire both through the Obsidian plugin entry. The post processor reads source, computes section spacing, clears previous plugin-owned output, and applies spacer elements or section padding.

**Tech Stack:** Obsidian plugin API, TypeScript, esbuild, Node built-in `assert` for parser tests.

## Global Constraints

- The plugin applies only to Obsidian Reading mode through the Markdown post processor pipeline.
- One eligible source blank line renders as one visual blank line.
- Blank lines inside fenced code blocks and fenced math blocks are excluded.
- The first version has no settings page, commands, ribbon actions, status indicators, or Live Preview support.
- The plugin must not modify Markdown source.
- DOM changes must be idempotent and removable by clearing plugin-owned markers.
- Existing unrelated worktree changes must not be reverted.

---

## File Structure

- `src/blank-line-analysis.ts`: pure source analysis and section classification.
- `tests/blank-line-analysis.test.mjs`: lightweight Node test runner that bundles the TypeScript module with esbuild and asserts parser behavior.
- `src/reading-mode-renderer.ts`: DOM constants and functions for clearing and applying rendered spacing.
- `main.ts`: Obsidian plugin entry, source cache, vault event invalidation, and Markdown post processor wiring.
- `styles.css`: plugin styles for spacers, block padding, and controlled Reading mode margins.
- `package.json`: add a `test` script that runs the parser tests.

---

### Task 1: Source Analysis

**Files:**
- Create: `src/blank-line-analysis.ts`
- Create: `tests/blank-line-analysis.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `interface BlankLineRun { startLine: number; endLine: number; count: number }`
- Produces: `interface SectionBlankLines { leading: number; trailing: number; internal: BlankLineRun[] }`
- Produces: `function normalizeMarkdownLines(source: string): string[]`
- Produces: `function findEligibleBlankLineRuns(lines: string[]): BlankLineRun[]`
- Produces: `function classifySectionBlankLines(lines: string[], lineStart: number, lineEnd: number): SectionBlankLines`

- [ ] **Step 1: Add the failing parser test**

Create `tests/blank-line-analysis.test.mjs` with:

```js
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const tempDir = await mkdtemp(path.join(tmpdir(), 'blank-line-analysis-'));
const outfile = path.join(tempDir, 'blank-line-analysis.mjs');

await esbuild.build({
  entryPoints: ['src/blank-line-analysis.ts'],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'es2018',
  external: ['obsidian'],
});

const {
  normalizeMarkdownLines,
  findEligibleBlankLineRuns,
  classifySectionBlankLines,
} = await import(pathToFileURL(outfile).href);

try {
  {
    const lines = normalizeMarkdownLines('Alpha\n\n\nBeta');
    assert.deepEqual(findEligibleBlankLineRuns(lines), [
      { startLine: 1, endLine: 2, count: 2 },
    ]);
  }

  {
    const lines = normalizeMarkdownLines('Alpha\n\n```ts\n\ncode\n```\n\nBeta');
    assert.deepEqual(findEligibleBlankLineRuns(lines), [
      { startLine: 1, endLine: 1, count: 1 },
      { startLine: 6, endLine: 6, count: 1 },
    ]);
  }

  {
    const lines = normalizeMarkdownLines('Alpha\n\n$$\n\nx = y\n$$\n\nBeta');
    assert.deepEqual(findEligibleBlankLineRuns(lines), [
      { startLine: 1, endLine: 1, count: 1 },
      { startLine: 6, endLine: 6, count: 1 },
    ]);
  }

  {
    const lines = normalizeMarkdownLines('\n# Title\n\nBody\n\n');
    assert.deepEqual(classifySectionBlankLines(lines, 1, 3), {
      leading: 1,
      trailing: 1,
      internal: [{ startLine: 2, endLine: 2, count: 1 }],
    });
  }

  {
    const lines = normalizeMarkdownLines('> Alpha\n>\n> Beta\n\nAfter');
    assert.deepEqual(classifySectionBlankLines(lines, 0, 2), {
      leading: 0,
      trailing: 1,
      internal: [{ startLine: 1, endLine: 1, count: 1 }],
    });
  }
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
```

- [ ] **Step 2: Add the test script**

Modify `package.json` scripts to include:

```json
{
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production",
    "test": "node tests/blank-line-analysis.test.mjs"
  }
}
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`

Expected: FAIL because `src/blank-line-analysis.ts` does not exist or does not export the requested functions.

- [ ] **Step 4: Implement the source analysis module**

Create `src/blank-line-analysis.ts` with:

```ts
export interface BlankLineRun {
  startLine: number;
  endLine: number;
  count: number;
}

export interface SectionBlankLines {
  leading: number;
  trailing: number;
  internal: BlankLineRun[];
}

export function normalizeMarkdownLines(source: string): string[] {
  return source.replace(/\r\n?/g, '\n').split('\n');
}

export function findEligibleBlankLineRuns(lines: string[]): BlankLineRun[] {
  const runs: BlankLineRun[] = [];
  let runStart: number | null = null;
  let inCodeFence = false;
  let codeFenceMarker = '';
  let inMathFence = false;

  const flushRun = (endLine: number): void => {
    if (runStart === null) return;
    runs.push({
      startLine: runStart,
      endLine,
      count: endLine - runStart + 1,
    });
    runStart = null;
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const trimmed = line.trim();
    const codeFence = line.match(/^\s*(`{3,}|~{3,})/);
    const mathFence = trimmed === '$$';

    if (codeFence && !inMathFence) {
      flushRun(index - 1);
      const marker = codeFence[1][0];
      if (inCodeFence && marker === codeFenceMarker) {
        inCodeFence = false;
        codeFenceMarker = '';
      } else if (!inCodeFence) {
        inCodeFence = true;
        codeFenceMarker = marker;
      }
      continue;
    }

    if (mathFence && !inCodeFence) {
      flushRun(index - 1);
      inMathFence = !inMathFence;
      continue;
    }

    if (inCodeFence || inMathFence) {
      flushRun(index - 1);
      continue;
    }

    if (trimmed === '') {
      if (runStart === null) runStart = index;
      continue;
    }

    flushRun(index - 1);
  }

  flushRun(lines.length - 1);
  return runs;
}

export function classifySectionBlankLines(
  lines: string[],
  lineStart: number,
  lineEnd: number,
): SectionBlankLines {
  const runs = findEligibleBlankLineRuns(lines);
  const internal: BlankLineRun[] = [];
  let leading = 0;
  let trailing = 0;

  for (const run of runs) {
    if (run.endLine < lineStart) {
      if (run.endLine === lineStart - 1) leading = run.count;
      continue;
    }

    if (run.startLine > lineEnd) {
      if (run.startLine === lineEnd + 1) trailing = run.count;
      continue;
    }

    const startLine = Math.max(run.startLine, lineStart);
    const endLine = Math.min(run.endLine, lineEnd);
    if (startLine <= endLine) {
      internal.push({
        startLine,
        endLine,
        count: endLine - startLine + 1,
      });
    }
  }

  return { leading, trailing, internal };
}
```

- [ ] **Step 5: Run parser tests and build**

Run: `npm test`

Expected: PASS with no assertion failures.

Run: `npm run build`

Expected: PASS with TypeScript and esbuild completing.

- [ ] **Step 6: Commit Task 1**

```bash
git add package.json src/blank-line-analysis.ts tests/blank-line-analysis.test.mjs
git commit -m "test: cover reading mode blank line analysis"
```

---

### Task 2: Reading Mode Renderer

**Files:**
- Create: `src/reading-mode-renderer.ts`
- Modify: `styles.css`

**Interfaces:**
- Consumes: `SectionBlankLines` from `src/blank-line-analysis.ts`
- Produces: `const SPACER_CLASS: 'reading-blank-line-spacer'`
- Produces: `const OWNED_ATTRIBUTE: 'data-reading-blank-lines'`
- Produces: `function clearRenderedBlankLines(el: HTMLElement): void`
- Produces: `function applySectionBlankLines(el: HTMLElement, spacing: SectionBlankLines): void`

- [ ] **Step 1: Create renderer module**

Create `src/reading-mode-renderer.ts` with:

```ts
import { SectionBlankLines } from './blank-line-analysis';

export const SPACER_CLASS = 'reading-blank-line-spacer';
export const BLOCK_CLASS = 'reading-blank-lines-block';
export const OWNED_ATTRIBUTE = 'data-reading-blank-lines';
export const BEFORE_PROPERTY = '--reading-blank-lines-before';
export const AFTER_PROPERTY = '--reading-blank-lines-after';

export function clearRenderedBlankLines(el: HTMLElement): void {
  el.querySelectorAll<HTMLElement>(`[${OWNED_ATTRIBUTE}]`).forEach((node) => {
    node.remove();
  });

  const block = findRenderedBlock(el);
  block.style.removeProperty(BEFORE_PROPERTY);
  block.style.removeProperty(AFTER_PROPERTY);
  block.classList.remove(BLOCK_CLASS);
}

export function applySectionBlankLines(
  el: HTMLElement,
  spacing: SectionBlankLines,
): void {
  const block = findRenderedBlock(el);
  setBlockSpacing(block, BEFORE_PROPERTY, spacing.leading);
  setBlockSpacing(block, AFTER_PROPERTY, spacing.trailing);
  insertInternalSpacers(el, spacing.internal.map((run) => run.count));
}

function insertInternalSpacers(el: HTMLElement, counts: number[]): void {
  if (counts.length === 0) return;

  const children = Array.from(el.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && !child.hasAttribute(OWNED_ATTRIBUTE),
  );

  for (let index = 0; index < counts.length && index + 1 < children.length; index++) {
    const before = children[index + 1];
    for (let spacerIndex = 0; spacerIndex < counts[index]; spacerIndex++) {
      el.insertBefore(createSpacer('internal'), before);
    }
  }
}

function findRenderedBlock(el: HTMLElement): HTMLElement {
  const section = el.closest<HTMLElement>('.markdown-preview-section');
  if (!section) return el;

  let block = el;
  while (block.parentElement && block.parentElement !== section) {
    block = block.parentElement;
  }
  return block;
}

function setBlockSpacing(
  el: HTMLElement,
  property: string,
  count: number,
): void {
  if (count <= 0) return;
  el.classList.add(BLOCK_CLASS);
  el.style.setProperty(property, `${count}lh`);
}

function createSpacer(kind: string): HTMLDivElement {
  const spacer = document.createElement('div');
  spacer.className = SPACER_CLASS;
  spacer.setAttribute(OWNED_ATTRIBUTE, kind);
  spacer.setAttribute('aria-hidden', 'true');
  spacer.textContent = '\u00A0';
  return spacer;
}
```

- [ ] **Step 2: Replace plugin styles**

Set `styles.css` to:

```css
.reading-blank-line-spacer {
  display: block;
  height: 1lh;
  min-height: var(--line-height-normal, 1.5em);
  margin: 0;
  padding: 0;
  pointer-events: none;
}

.reading-blank-lines-block {
  padding-top: var(--reading-blank-lines-before, 0);
  padding-bottom: var(--reading-blank-lines-after, 0);
}

.markdown-preview-view
  .markdown-preview-section
  > [class^='el-']
  > :is(h1, h2, h3, h4, h5, h6, p, ul, ol, blockquote, pre, table, .callout) {
  margin-top: 0;
  margin-bottom: 0;
}
```

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: PASS. The renderer is not wired yet, but TypeScript compiles.

- [ ] **Step 4: Commit Task 2**

```bash
git add src/reading-mode-renderer.ts styles.css
git commit -m "feat: add reading mode blank line renderer"
```

---

### Task 3: Obsidian Plugin Wiring

**Files:**
- Modify: `main.ts`
- Modify: `manifest.json`
- Modify: `package.json`

**Interfaces:**
- Consumes: `normalizeMarkdownLines` and `classifySectionBlankLines`
- Consumes: `clearRenderedBlankLines` and `applySectionBlankLines`
- Produces: default Obsidian plugin class `ReadingModeBlankLinesPlugin`

- [ ] **Step 1: Replace plugin entry**

Set `main.ts` to:

```ts
import {
  MarkdownPostProcessorContext,
  Plugin,
  TAbstractFile,
  TFile,
} from 'obsidian';
import {
  classifySectionBlankLines,
  normalizeMarkdownLines,
} from './src/blank-line-analysis';
import {
  applySectionBlankLines,
  clearRenderedBlankLines,
} from './src/reading-mode-renderer';

export default class ReadingModeBlankLinesPlugin extends Plugin {
  private readonly sourceCache = new Map<string, Promise<string>>();

  async onload(): Promise<void> {
    this.registerEvent(
      this.app.vault.on('modify', (file) => this.invalidateCache(file)),
    );
    this.registerEvent(
      this.app.vault.on('delete', (file) => this.invalidateCache(file)),
    );

    this.registerMarkdownPostProcessor(async (el, ctx) => {
      await this.processSection(el, ctx);
    }, 100);
  }

  private invalidateCache(file: TAbstractFile): void {
    this.sourceCache.delete(file.path);
  }

  private async processSection(
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext,
  ): Promise<void> {
    const info = ctx.getSectionInfo(el);
    if (!info) return;

    const source = await this.readSource(ctx.sourcePath);
    if (source === null) return;

    const currentInfo = ctx.getSectionInfo(el);
    if (
      !currentInfo ||
      currentInfo.lineStart !== info.lineStart ||
      currentInfo.lineEnd !== info.lineEnd
    ) {
      return;
    }

    const lines = normalizeMarkdownLines(source);
    const spacing = classifySectionBlankLines(
      lines,
      currentInfo.lineStart,
      currentInfo.lineEnd,
    );

    clearRenderedBlankLines(el);
    applySectionBlankLines(el, spacing);
  }

  private async readSource(path: string): Promise<string | null> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return null;

    let pending = this.sourceCache.get(path);
    if (!pending) {
      pending = this.app.vault.cachedRead(file);
      this.sourceCache.set(path, pending);
      void pending.catch(() => this.sourceCache.delete(path));
    }

    try {
      return await pending;
    } catch {
      return null;
    }
  }
}
```

- [ ] **Step 2: Rename package metadata**

Update `manifest.json` to:

```json
{
  "id": "reading-mode-blank-lines",
  "name": "Reading Mode Blank Lines",
  "version": "0.1.0",
  "minAppVersion": "1.0.0",
  "description": "Preserves eligible Markdown source blank lines in Reading mode with exact spacing.",
  "author": "Yves Lefebvre",
  "authorUrl": "https://github.com/Ivanohe73",
  "isDesktopOnly": false
}
```

Update the top-level fields in `package.json` to:

```json
{
  "name": "reading-mode-blank-lines",
  "version": "0.1.0",
  "description": "Preserves eligible Markdown source blank lines in Reading mode with exact spacing."
}
```

Keep the existing scripts, keywords, author, license, and dev dependencies.

- [ ] **Step 3: Run tests and build**

Run: `npm test`

Expected: PASS.

Run: `npm run build`

Expected: PASS and `main.js` is generated.

- [ ] **Step 4: Commit Task 3**

```bash
git add main.ts manifest.json package.json package-lock.json main.js
git commit -m "feat: wire reading mode blank line preservation"
```

---

### Task 4: Documentation and Manual Verification Notes

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: implemented plugin behavior from Tasks 1-3.
- Produces: user-facing installation and behavior documentation.

- [ ] **Step 1: Replace README content**

Set `README.md` to:

```md
# Reading Mode Blank Lines

Reading Mode Blank Lines is an Obsidian plugin that preserves eligible Markdown source blank lines when notes are rendered in Reading mode.

## Behavior

- One eligible source blank line renders as one visual blank line.
- Consecutive eligible source blank lines render with the same count.
- Blank lines inside fenced code blocks and fenced math blocks are not changed.
- The plugin does not modify note content.
- The first version does not affect Live Preview and has no settings page.

## Development

Install dependencies:

```bash
npm install
```

Run parser tests:

```bash
npm test
```

Build the plugin:

```bash
npm run build
```

## Manual Verification

Create a test note with paragraphs, headings, lists, blockquotes, callouts, tables, fenced code blocks, fenced math blocks, and multiple consecutive blank lines. Switch to Reading mode and verify that eligible blank lines render exactly while fenced code and math block contents remain unchanged.
```

- [ ] **Step 2: Run final verification**

Run: `npm test`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

Run: `git status --short`

Expected: only intended files for Task 4 are modified, plus generated `main.js` if build changed it.

- [ ] **Step 3: Commit Task 4**

```bash
git add README.md main.js
git commit -m "docs: document reading mode blank lines"
```

---

## Self-Review

Spec coverage:

- Reading mode only: Task 3 uses `registerMarkdownPostProcessor` only.
- Exact blank-line height: Task 2 uses `1lh` spacer height and `lh` padding values.
- Exclude fenced code and math blocks: Task 1 parser tracks backtick, tilde, and `$$` fences.
- No settings, commands, ribbon actions, or Live Preview: Task 3 adds none.
- No source mutation: Task 3 reads through vault APIs and never writes notes.
- Idempotent DOM output: Task 2 clears owned spacers and CSS variables before applying spacing.
- Tests: Task 1 adds parser tests; Tasks 3 and 4 run tests plus TypeScript build.

Placeholder scan: this plan contains no placeholder markers, unspecified edge handling, or references to undefined interfaces.

Type consistency: `SectionBlankLines`, `BlankLineRun`, `classifySectionBlankLines`, `clearRenderedBlankLines`, and `applySectionBlankLines` are consistently named across tasks.
