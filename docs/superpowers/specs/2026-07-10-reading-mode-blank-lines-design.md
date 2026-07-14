# Reading Mode Blank Lines Design

## Purpose

Build a new Obsidian plugin behavior that preserves blank lines from Markdown source in Reading mode. The first version is intentionally narrow: no settings page, no Live Preview support, and no changes to note content. Enabling the plugin makes Reading mode render eligible source blank lines as visible vertical whitespace.

## Scope

The plugin applies only to Obsidian Reading mode through the Markdown post processor pipeline.

It preserves blank lines in normal Markdown body content with exact spacing: one eligible source blank line renders as one visual blank line. The plugin excludes blank lines inside fenced code blocks and fenced math blocks because those blocks already have their own whitespace semantics.

The first version does not include user settings, commands, ribbon actions, status indicators, or Live Preview support.

## User-Facing Behavior

When a note is rendered in Reading mode, the plugin reads the note source and compares it with each rendered Markdown section. It restores blank lines that Obsidian's normal Markdown rendering collapses.

Expected behavior:

- A single blank line between body blocks renders as one blank line of height.
- Multiple consecutive blank lines render as the same number of blank visual lines.
- Blank lines before and after headings, paragraphs, lists, quotes, callouts, tables, and other body blocks are preserved when they are outside excluded fenced blocks.
- Blank lines inside fenced code blocks and fenced math blocks are ignored by the plugin.
- Disabling or uninstalling the plugin leaves no note content changes and no persisted rendering artifacts.

## Architecture

### Plugin Entry

The plugin uses `registerMarkdownPostProcessor` to process Reading mode sections after Obsidian renders Markdown. For each section, it uses `ctx.getSectionInfo(el)` to obtain source line boundaries and `ctx.sourcePath` to read the corresponding Markdown file through Obsidian's vault APIs.

The plugin maintains a small source cache keyed by file path. Cache entries are invalidated when Obsidian reports vault `modify` or `delete` events for that path.

### Source Analysis

Source analysis is implemented as pure functions so it can be tested without Obsidian:

- Normalize line endings to `\n`.
- Track fenced code blocks opened by three or more backticks or tildes.
- Track fenced math blocks opened by `$$`.
- Identify blank-line runs outside those excluded ranges.
- For each rendered section, classify blank lines as leading, trailing, or internal relative to the section line range.

The parser is intentionally conservative. If a line belongs to an excluded fence, blank lines within that fence are not emitted as restorable blank lines.

### DOM Mapping

The post processor is responsible for mapping analyzed blank-line runs onto the rendered section DOM:

- Leading and trailing blank lines are applied to the top-level rendered section block as CSS-variable-driven padding.
- Internal blank lines are inserted as plugin-owned spacer elements between rendered body blocks when the neighboring rendered elements can be identified.
- If a blank-line run cannot be mapped confidently to an internal DOM position, the plugin skips that run rather than inserting whitespace in an unsafe location.

The processor is idempotent. Before adding new spacing, it removes previous plugin-owned spacer elements and clears plugin-owned CSS variables from the current rendered block.

### Styling

Spacer elements are inert and hidden from accessibility APIs:

- `aria-hidden="true"`
- plugin-owned `data-*` marker
- `display: block`
- `height: 1lh`
- fallback height through `var(--line-height-normal, 1.5em)`
- no margin, padding, or pointer events

Reading mode block margins controlled by the plugin are normalized to zero for affected top-level Markdown blocks. This makes vertical spacing predictable: source blank lines become the single source of inter-block blank-line height.

## Error Handling

If the source file cannot be found or read, the processor returns without changing the DOM.

If an asynchronous processor finishes after Obsidian has recycled or rerendered a section, the processor rechecks section line boundaries before mutating the DOM. If boundaries no longer match, it returns.

If a DOM mapping is ambiguous, the plugin prefers skipping the ambiguous spacing over risking layout corruption.

## Testing

The core blank-line parser should be covered with unit tests for:

- normal paragraph blank lines
- consecutive multi-line blank runs
- blank lines before and after headings
- document-leading and document-trailing blank lines
- fenced code block exclusion
- fenced math block exclusion
- quoted and callout body blank lines
- mixed sections where excluded fences and normal body content appear together

The plugin integration layer is verified with the TypeScript build. Manual Obsidian verification should use a note containing paragraphs, headings, lists, quotes, callouts, code fences, math fences, and multiple consecutive blank-line runs.

## Non-Goals

- Live Preview rendering support
- settings UI
- per-note configuration
- modifying Markdown source
- changing how fenced code blocks or math blocks render their own whitespace
- guaranteeing restoration in DOM positions Obsidian does not expose clearly enough to map safely
