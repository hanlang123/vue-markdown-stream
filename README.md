# vue-markdown-stream

> 流式 Markdown 渲染 + Vue 3 组件块，基于 `markdown-it-container`

[![npm](https://img.shields.io/npm/v/vue-markdown-stream)](https://www.npmjs.com/package/vue-markdown-stream)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

在 AI 流式输出场景中，将 `:::alert`、`:::card` 等 Markdown 容器块实时渲染为真实 Vue 3 组件，支持响应式 props 和 slot 内容。

**📖 [完整文档](https://hanlang123.github.io/vue-markdown-stream/) · [在线演示](https://hanlang123.github.io/vue-markdown-stream/demo)**

## 特性

- ⚡ **流式打字机渲染** — 逐字追加，自动补全未闭合 `:::` 块
- 🧩 **Vue 组件块** — `:::alert` / `:::card` 渲染为真实 Vue 组件（响应式 props + slot）
- 🔌 **完全可扩展** — 5 行代码注册任意自定义块组件
- 🪶 **轻量** — 基于 `DOMParser` + `h()` VNode 树，无运行时编译，bundle 增量约 40KB

## 安装

```bash
npm install vue-markdown-stream markdown-it markdown-it-container
```

## 快速上手

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { MarkdownRenderer, useStreamingText } from 'vue-markdown-stream'

const { text, isStreaming, startStream, resetStream } = useStreamingText()
const display = computed(() => isStreaming.value ? text.value + '▍' : text.value)
</script>

<template>
  <button @click="startStream">开始流式输出</button>
  <button @click="resetStream">重置</button>
  <MarkdownRenderer :content="display" />
</template>
```

## Markdown 语法

```markdown
::: alert info
**提示**：这是一个 Info 告警块。
:::

::: alert warning
注意：`未闭合的块`在流式中间态会被自动补全。
:::

::: card 数据卡片标题
| 列A | 列B |
|-----|-----|
| 值1 | 值2 |
:::
```

## 渲染架构

```
流式 chunk
  → autoCloseContainers()       补全未闭合 ::: 块
  → markdown-it + container     输出含 <vue-block> 的 HTML
  → DOMParser                   HTML → DOM 树
  → h() VNode 构建              <vue-block> → Vue 组件 VNode
  → MarkdownRenderer            渲染输出
```

## 本地开发

```bash
npm install
npm run dev          # http://localhost:5173/
npm run build        # App 构建
npm run build:lib    # 库构建（dist/）
npm run docs:dev     # 文档本地预览
npm run docs:build   # 文档构建
```

## License

[MIT](./LICENSE) © 2026 hanlang123
