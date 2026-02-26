# MarkdownRenderer

核心渲染组件，将 Markdown 字符串转换为 VNode 树，`<vue-block>` 占位元素被替换为真实 Vue 组件。

## 用法

```vue
<script setup lang="ts">
import { MarkdownRenderer } from 'vue-markdown-stream'
</script>

<template>
  <MarkdownRenderer :content="markdownString" />
</template>
```

## Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `content` | `string` | `''` | Markdown 字符串，支持流式追加 |

## 渲染流程

```
content
  → autoCloseContainers(content)     处理流式未闭合块
  → md.render(completedMarkdown)     markdown-it 输出 HTML（含 <vue-block>）
  → DOMParser.parseFromString(html)  HTML → DOM 树
  → domNodeToVNode(node)             递归转为 h() VNode
  → h('div.markdown-body', vnodes)   最终输出
```

## 样式

输出根元素带 `markdown-body` class，内置排版样式覆盖：

- 标题（h1–h4）、段落、链接
- `code` / `pre` 代码块（深色背景）
- 表格、列表、引用块
- 水平分割线

引入内置样式：

```typescript
import 'vue-markdown-stream/style.css'
```

也可使用 Tailwind Typography 或其他 prose 样式替代，只需对 `.markdown-body` 应用即可。

## 扩展 componentMap

默认内置 `AlertBlock` 和 `DataCard`。如需添加自定义组件，请参考[自定义块](../guide/custom-blocks)文档直接修改源码，或 fork 本库后自行扩展。

> 后续版本计划支持通过 props 传入自定义 `componentMap`。
