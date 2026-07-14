实现原理可以概括为四部分：

1. 读取 Markdown 原文

插件使用 Obsidian 的 `registerMarkdownPostProcessor`，只在 Reading mode 渲染完成后处理内容。

每个渲染区通过：

```ts
ctx.getSectionInfo(el)
```

获取对应的 Markdown 原文、起止行号和当前区块文本。

插件直接使用 `currentInfo.text` 分析内容，避免读取 Vault 缓存导致内容滞后。

2. 分析空行

插件扫描 Markdown 行内容，识别：

- 普通空行
- 引用中的空行，例如 `>`
- 连续空行数量
- 代码块中的空行会被排除
- 数学块中的空行会被排除

空行会被分成三类：

- `leading`：区块前面的空行
- `trailing`：区块后面的空行
- `internal`：两个内容区块中间的空行

区块边缘的空行使用上下内边距实现，中间空行则插入专用的 spacer 元素。

3. 根据行高渲染

插件获取当前内容块的实际 CSS 行高，例如：

```text
20px
```

然后根据设置倍率计算空行高度：

```text
空行高度 = 当前正文行高 × 设置倍率
```

例如：

```text
正文行高：20px
设置倍率：1.5
空行高度：30px
```

连续 2 个空行就是：

```text
30px × 2 = 60px
```

这样空行数量不同，就会产生实际不同的间距。

4. 自动刷新机制

当用户在编辑模式新增或删除空行时，插件会监听：

```text
editor-change
```

并标记当前 Markdown view 需要刷新。

当用户重新进入 Reading mode，或者发生布局/活动页面切换时，插件检测到该页面过期，就调用：

```ts
view.previewMode.rerender(true)
```

重新生成 Reading mode DOM，然后再次分析空行。

因此不再依赖手动刷新按钮，也不会继续使用旧的渲染结果。

设置页中的滑动条会：

- 读取已保存的倍率
- 将数值限制在最小值和最大值之间
- 调用 `saveData()` 保存
- 修改后立即刷新当前 Reading mode 页面

整体流程就是：

```text
Markdown 编辑
    ↓
editor-change 标记过期
    ↓
重新进入 Reading mode
    ↓
Obsidian 重新渲染
    ↓
插件分析当前文本
    ↓
计算空行数量和高度
    ↓
插入间距并显示
```