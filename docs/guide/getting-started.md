# 快速上手

## 安装

```bash
npm install vue-markdown-stream
```

::: tip 对等依赖
`vue >= 3.3`、`markdown-it >= 14`、`markdown-it-container >= 4` 需要单独安装（peerDependencies）。

```bash
npm install markdown-it markdown-it-container
```
:::

## 基础用法

最简单的用法，直接传入 Markdown 字符串：

```vue
<script setup lang="ts">
import { MarkdownRenderer } from 'vue-markdown-stream'

const content = `
# Hello vue-markdown-stream

::: alert info
这是一个 **Info** 提示块，会被渲染为 Vue 组件。
:::

::: card 数据卡片
| 字段 | 值 |
|------|-----|
| 版本 | 1.0.0 |
| 协议 | MIT |
:::
`
</script>

<template>
  <MarkdownRenderer :content="content" />
</template>
```

## 使用内置样式

引入配套的 prose 排版样式：

```typescript
// main.ts 或组件中
import 'vue-markdown-stream/style.css'
```

## 流式用法

配合 `useStreamingText` composable 实现打字机效果：

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { MarkdownRenderer, useStreamingText } from 'vue-markdown-stream'

const { text, isStreaming, startStream, resetStream } = useStreamingText()

// 流式输出时追加打字机光标
const display = computed(() =>
  isStreaming.value ? text.value + '▍' : text.value
)
</script>

<template>
  <div>
    <button :disabled="isStreaming" @click="startStream">开始</button>
    <button @click="resetStream">重置</button>
    <MarkdownRenderer :content="display" />
  </div>
</template>
```

## 在线演示

<StreamDemo />

## 下一步

- [流式输出详解](./streaming) — 对接真实 SSE/Stream API
- [自定义块](./custom-blocks) — 注册自己的 Vue 组件块
- [API 参考](../api/markdown-renderer) — 完整 API 文档
