# Preserve Blank Lines

An [Obsidian](https://obsidian.md) plugin that preserves consecutive blank lines in **reading mode**, matching the source 1:1.

By default, Obsidian's Markdown renderer collapses any number of consecutive blank lines into a single paragraph break in reading mode. This plugin restores the extra blanks so that the visual spacing matches what you typed.

## Why this exists

I am migrating my notes from Zim desktop wiki to Obsidian as it has better support for code blocks and mobile devices. However, one thing that was bugging me was that some of my notes, once transferred to Obsidian, looked "cramped". I found out that Zim preserves blank lines.

I was not able to find any simple solution for Obsidian : What I found on forums was to add "/" slash character on blank line you want to preserve, or some "Em Space" (invisible character) that made editing confusing because it is difficult to see. Or some html `<br>` tag.

Other people say if you don't like Markdown, then use another tool than Obsidian. I see Obsidian already has some specific Obsidian-only Markdown syntax, so why not add an option in it to preserve space in reader mode? Personal notes aren't tech documentation. I want spacing the way other tools allow it.

Hence this plugin. Hope you find it useful!

## Example

Source:

```markdown
First paragraph.



Second paragraph after three blank lines.
```

Without the plugin, reading mode collapses this to a single paragraph break. With the plugin enabled, the three blank lines are preserved.

## Install

### Manual install

1. Download `main.js`, `manifest.json`, and `versions.json` from the [latest release](https://github.com/Ivanohe73/obsidian-preserve-blank-lines/releases).
2. Place them in `<your-vault>/.obsidian/plugins/preserve-blank-lines/`.
3. In Obsidian: **Settings -> Community plugins**, disable Restricted mode if needed, click the refresh icon, then enable **Preserve Blank Lines**.

### From the community store

Not yet submitted. Once approved, it will be installable from **Settings -> Community plugins -> Browse**.

## Customize spacing

Each preserved blank line is rendered as a `<div class="preserve-blank-line">`. Add a CSS snippet (**Settings -> Appearance -> CSS snippets**) to tweak height:

```css
.preserve-blank-line {
  line-height: 1.5;
}
```

## Known limitations

- **Skips nested contexts.** Inside callouts, transclusions/embeds, and some other nested rendering contexts, Obsidian's `MarkdownPostProcessorContext.getSectionInfo()` returns `null`. Blocks in those contexts are silently passed through unchanged. See the [API docs](https://docs.obsidian.md/Reference/TypeScript+API/MarkdownPostProcessorContext/getSectionInfo).

## Build from source

Requires [Node.js](https://nodejs.org/) 18+ and npm.

```sh
git clone https://github.com/Ivanohe73/obsidian-preserve-blank-lines.git
cd obsidian-preserve-blank-lines
npm install
npm run dev    # watch mode for development
npm run build  # production bundle
```

The build outputs `main.js` in the project root.

## License

[MIT](LICENSE)
