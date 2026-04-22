# MarkdownRenderer

核心渲染组件，将 Markdown 字符串转换为 VNode 树，`<vue-block>` 占位元素被替换为真实 Vue 组件。

## 用法

```vue
<script setup lang="ts">
import { MarkdownRenderer, defineBlock } from '@krishanjinbo/vue-markdown-stream'
import JobCardBlock from './JobCardBlock.vue'

const blocks = [
  defineBlock({ name: 'job-card', component: JobCardBlock, parseInfo: 'json' }),
]
</script>

<template>
  <MarkdownRenderer
    :content="markdownString"
    :blocks="blocks"
    streaming
    cursor="▍"
    @agent:action="handleAction"
  />
</template>
```

## Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `content` | `string` | **必填** | Markdown 字符串，支持流式追加 |
| `blocks` <Badge type="tip" text="v3" /> | `BlockDefinition[]` | `[]` | 通过 `defineBlock` 注册的额外块（推荐方式） |
| `components` | `ComponentMap` | `{}` | 自定义组件注册表（与内置组件合并，用户组件优先） |
| `propsSchemas` | `Record<string, ComponentPropsSchema>` | `{}` | 自定义 Props Schema（与默认 Schema 合并） |
| `enableValidation` | `boolean` | `true` | 是否启用 Props 安全校验 |
| `streaming` <Badge type="tip" text="v3" /> | `boolean` | `false` | 流式模式。开启后 ① 末尾自动附加 `cursor`；② 使用 rAF 节流解析，避免每个 chunk 重解析 |
| `cursor` <Badge type="tip" text="v3" /> | `string` | `'▍'` | 流式光标字符；传空字符串禁用 |

## Events

| 事件 | 载荷类型 | 说明 |
|------|---------|------|
| `agent:action` | `AgentActionPayload` | 任何内置或自定义块组件触发的用户交互事件 |

## 注册自定义块（推荐 v3 API）

```typescript
import { defineBlock } from '@krishanjinbo/vue-markdown-stream'

const blocks = [
  defineBlock({
    name: 'job-card',         // ::: job-card
    component: JobCardBlock,
    parseInfo: 'json',        // ':::job-card {"title":"..."}' → data-props
    schema: { title: { type: 'string', required: true } },
    docs: {
      description: '职位卡片',
      example: '::: job-card {"title":"前端"}\n\n:::',
      fields: [{ name: 'title', type: 'string' }],
    },
  }),
]
```

详见 [Block Registry API](./block-registry) 与指南：[自定义块](../guide/custom-blocks)。

## 渲染流程

```
content
  → autoCloseContainers(content)     处理流式未闭合块
  → md.render(completedMarkdown)     markdown-it 输出 HTML（含 <vue-block>）
  → htmlToVnodes(html, opts)         HTML → VNode 树 + Props 校验 + 事件绑定
                                      - DOMParser（浏览器）/ fallback 解析器（SSR）
                                      - stableKey + propsCache 保证流式引用稳定
  → AgentEventBus                    组件事件 → @agent:action
  → h('div.markdown-body', vnodes)   最终输出
```

## 内置组件注册表

| 组件名 | 块语法 | `parseInfo` |
|--------|--------|-------------|
| `AlertBlock` | `:::alert info` | 自定义函数 |
| `DataCard` | `:::card 标题` | `title` |
| `ConfirmBlock` | `:::confirm action=xx level=danger` | `attrs` |
| `SelectBlock` | `:::select mode=single` | `attrs` |
| `FormBlock` | `:::form id=xx` | `attrs` |
| `ProgressBlock` | `:::progress value=73 max=100` | `attrs` |
| `DataTableBlock` | `:::datatable sortable` | `attrs` |
| `ActionPills` | `:::actions` | `attrs` |
| `ArtifactBlock` | `:::artifact type=code lang=python` | `attrs` |

## 流式模式详解

```vue
<template>
  <MarkdownRenderer :content="buffer" streaming />
</template>
```

开启 `streaming` 后：

- 末尾自动追加 `cursor`（默认 `▍`），无需调用方自行拼接
- rAF 节流解析：高频 chunk 仅在下一帧统一 parse 一次，避免性能抖动
- `propsCache` 在组件生命周期内复用 —— 相同 JSON payload 返回同一引用，触发 Vue 子组件 props 浅相等优化
- 未闭合容器经 `autoCloseContainers` 自动补全，中间态 DOM 始终合法

## 子包：`/chat` Chat 壳层

[`@krishanjinbo/vue-markdown-stream/chat`](../guide/chat-quickstart) 子包提供 `ChatMessage` / `ChatMessageList` / `ChatInput` / `AgentStatusTimeline`，可与 `useAgentStream` 组合，10 行内搭出一个 AI 聊天页。

## 样式

输出根元素带 `markdown-body` class。引入内置样式：

```typescript
import '@krishanjinbo/vue-markdown-stream/style.css'
```
