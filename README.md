# Reading Mode Blank Lines

**Reading Mode Blank Lines** is an Obsidian plugin that preserves eligible blank lines from the Markdown source when notes are rendered in **Reading mode**.

**Reading Mode Blank Lines** 是一个 Obsidian 插件，用于在笔记渲染为 **Reading mode（阅读模式）** 时，保留 Markdown 源文件中符合条件的空行。


Thanks to the following plugin:

感谢以下插件：

[Ivanohe73/obsidian-preserve-blank-lines](https://github.com/Ivanohe73/obsidian-preserve-blank-lines)

This plugin fixes several issues found in `preserve-blank-lines`:

本插件解决了 `preserve-blank-lines` 中的一些问题：

* After adding blank lines in **Live Preview mode**, switching back to **Reading mode** now triggers a re-render and displays the latest number of blank lines.
* The blank-line size can be freely adjusted in the plugin settings.

* 在 **Live Preview（实时预览）** 模式下添加空行后，再次切换到 **Reading mode（阅读模式）** 时会触发重新渲染，并显示最新的空行数量。
* 支持在插件设置中自由调整空行高度。

This plugin was developed entirely with Codex.

本插件完全使用 Codex 开发。


## Development / 开发

Install dependencies / 安装依赖：

```bash
npm install
```

Run parser tests / 运行解析器测试：

```bash
npm test
```

Build the plugin / 构建插件：

```bash
npm run build
```

After building, get the following file / 构建完成后获取以下文件：

```text
main.js
```

Use it together with the following files / 将其与以下文件一起使用：

```text
manifest.json
style.css
versions.json
```
