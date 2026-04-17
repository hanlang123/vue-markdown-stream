# 快速上手

## 安装

```bash
npm install @krishanjinbo/vue-markdown-stream
```

::: tip 对等依赖
`vue >= 3.3`、`markdown-it >= 14`、`markdown-it-container >= 4` 需要单独安装（peerDependencies）。

```bash
npm install markdown-it markdown-it-container
```
:::

## 基础用法（v1 兼容，零改动）

```vue
<script setup lang="ts">
import { MarkdownRenderer } from '@krishanjinbo/vue-markdown-stream'

const content = `
# Hello vue-markdown-stream

::: alert info
这是一个 **Info** 提示块，会被渲染为 Vue 组件。
:::

::: card 数据卡片
| 字段 | 值 |
|------|-----|
| 版本 | 2.0.0 |
| 协议 | MIT |
:::
`
</script>

<template>
  <MarkdownRenderer :content="content" />
</template>
```

## 使用内置样式

```typescript
import '@krishanjinbo/vue-markdown-stream/style.css'
```

## 流式用法

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { MarkdownRenderer, useStreamingText } from '@krishanjinbo/vue-markdown-stream'

const { text, isStreaming, startStream, resetStream } = useStreamingText()

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

## Agent 交互用法（v2 新增）

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { MarkdownRenderer, useAgentEvents } from '@krishanjinbo/vue-markdown-stream'

const content = ref('')
const { createHandler, serializeToMessage } = useAgentEvents()

const handleAction = createHandler(async (payload) => {
  const message = serializeToMessage(payload)
  console.log('发送给 Agent:', message)
  // await sendToAgent(message)
})
</script>

<template>
  <MarkdownRenderer
    :content="content"
    @agent:action="handleAction"
  />
</template>
```

## 在线演示

<StreamDemo />

## 下一步

- [流式输出详解](./streaming) — 对接真实 SSE/Stream API
- [自定义块](./custom-blocks) — 注册自己的 Vue 组件块
- [Agent 交互组件](./agent-blocks) — 内置交互组件用法
- [Artifact 内容块](./artifact) — 类似 Claude Code 的 Artifact 面板
- [事件系统](./events) — AgentEventBus 详解
- [API 参考](../api/markdown-renderer) — 完整 API 文档
