# Composables

## `useStreamingText`

模拟流式打字机输出的 composable，适用于 Demo 和开发调试。

### 返回值

```typescript
const {
  text,         // Ref<string>   — 当前已输出的完整文本
  isStreaming,  // Ref<boolean>  — 是否正在输出
  startStream,  // () => void    — 开始/继续输出
  stopStream,   // () => void    — 暂停（保留进度）
  resetStream,  // () => void    — 重置到初始状态
} = useStreamingText()
```

### 行为

- `startStream()` 每 30ms 追加 1~3 个随机字符
- 重复调用 `startStream()` 无效（防止多次触发）
- `stopStream()` 后再次调用 `startStream()` 会从暂停位置继续
- `resetStream()` 会同时停止输出并清空 `text`

---

## `useAgentEvents` <Badge type="tip" text="v2" />

Agent 事件管理 composable，用于处理和序列化组件交互事件。

### 返回值

```typescript
const {
  lastAction,        // Ref<AgentActionPayload | null>  — 最近一次事件
  actionHistory,     // Ref<AgentActionPayload[]>       — 事件历史
  isProcessing,      // Ref<boolean>                    — 是否正在处理
  createHandler,     // (handler) => eventHandler        — 创建事件处理函数
  serializeToMessage, // (payload) => string            — 序列化为文本消息
} = useAgentEvents()
```

### `createHandler(handler)`

包装自定义处理逻辑为可绑定到 `@agent:action` 的函数：

```typescript
const handleAction = createHandler(async (payload) => {
  await sendToAgent(serializeToMessage(payload))
})
```

### `serializeToMessage(payload)`

将事件载荷序列化为可读文本，发送给 Agent：

| 事件类型 | 序列化结果 |
|---------|-----------|
| `confirm` | `[用户操作] ConfirmBlock — 确认了操作: delete_user` |
| `cancel` | `[用户操作] ConfirmBlock — 取消了操作: delete_user` |
| `submit` | `[用户操作] FormBlock — 提交了表单: {"rating":"满意"}` |
| `select` | `[用户操作] SelectBlock — 选择了: [0]` |
| `pill_click` | `[用户操作] ActionPills — 点击了快捷操作: "生成报告"` |

---

## `useMarkdownParser` <Badge type="tip" text="v2" />

创建 Markdown 解析器实例（增强版，已注册所有内置容器块）。

```typescript
import { useMarkdownParser, defineBlock } from '@krishanjinbo/vue-markdown-stream'
import JobCardBlock from './JobCardBlock.vue'

const { parse, md, registry } = useMarkdownParser({
  blocks: [
    defineBlock({ name: 'job-card', component: JobCardBlock, parseInfo: 'json' }),
  ],
})

const html: string = parse('::: job-card {"title":"前端工程师"}\n\n:::')
```

### 入参 `MarkdownParserOptions`

| 字段 | 类型 | 说明 |
|------|------|------|
| `blocks` | `BlockDefinition[]` | v3 新增。通过 `defineBlock` 注册的额外块，会与内置块合并 |

### 返回值

| 属性 | 类型 | 说明 |
|------|------|------|
| `parse` | `(content: string) => string` | 解析 Markdown（自动调用 `autoCloseContainers`） |
| `md` | `MarkdownIt` | 底层 markdown-it 实例，可用于进一步配置 |
| `registry` | `BlockRegistry` | v3 新增。块注册中心，可动态 `register` / `remove`（详见 [Block Registry API](./block-registry)） |

---

## `useAgentStream` <Badge type="tip" text="v3" />

真实的流式通信 composable。基于 `fetch` + `ReadableStream`，内置 **SSE / NDJSON / 纯文本** 三种 frame 解析器，管理 `content`、`isStreaming`、`statusSteps`、`isInterrupted`、`error` 等状态，并支持 **中断（abort）** 和 **续播（resumePrefix）**。

```typescript
import { useAgentStream } from '@krishanjinbo/vue-markdown-stream'

const {
  content,          // Ref<string>
  isStreaming,      // Ref<boolean>
  isInterrupted,    // Ref<boolean>
  status,           // Ref<AgentStatus>
  statusSteps,      // Ref<AgentStatusStep[]>
  conversationId,   // Ref<string | undefined>
  error,            // Ref<Error | null>
  start,            // (opts: StartStreamOptions) => Promise<void>
  abort,            // () => void
  reset,            // () => void
} = useAgentStream()

await start({
  url: '/api/chat/stream',
  body: { message: 'hi' },
  onMeta: (m) => console.log('sessionId:', m.conversationId),
})
```

### `start(options)` 入参

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `url` | `string` | — | 请求 URL |
| `method` | `string` | `'POST'` | HTTP 方法 |
| `body` | `unknown` | — | 请求体，会被 `JSON.stringify` |
| `headers` | `Record<string, string>` | — | 额外请求头；默认附带 `Content-Type: application/json` 和 `Accept: text/event-stream` |
| `signal` | `AbortSignal` | 内部生成 | 自定义 abort 信号 |
| `parser` | `FrameParser` | `sseParser` | frame 解析器（`sseParser` / `ndjsonParser` / `textParser` / 自定义） |
| `resumePrefix` | `string` | — | 续播前缀：将已有 partial content 作为初始值 |
| `onMessage` | `(content, delta) => void` | — | 正文增量回调 |
| `onStatus` | `(status) => void` | — | Agent 状态变化 |
| `onStep` | `(step: AgentStatusStep) => void` | — | 状态步骤新增/更新 |
| `onMeta` | `(meta) => void` | — | 元信息（含 `conversationId`） |
| `onDone` | `() => void` | — | 正常完成 |
| `onError` | `(err: Error) => void` | — | 错误 |

### 内置 Frame Parsers

| Parser | 适用格式 |
|--------|----------|
| `sseParser` | `data: {...}\n\n` 形式（OpenAI / Anthropic 风格） |
| `ndjsonParser` | 每行一个 JSON |
| `textParser` | 纯文本 chunk，直接作为 message |

SSE/NDJSON payload 约定字段：

- `content` / `delta` → `message` 事件
- `status` → `status` 事件
- `step` (object) → `step` 事件
- `conversationId` / `sessionId` / `meta` → `meta` 事件
- `done: true` / `finish_reason` → `done` 事件
- `error` → `error` 事件
- SSE 的 `data: [DONE]` 字面量也会触发 `done`

### 类型

```typescript
type AgentStatus =
  | 'idle' | 'thinking' | 'streaming'
  | 'tool-calling' | 'completed' | 'failed' | 'interrupted'

interface AgentStatusStep {
  id: string
  status: AgentStatus | string
  label?: string
  detail?: string
  startedAt: number
  finishedAt?: number
}
```

### 中断与续播

```typescript
// 中断
abort()     // 触发 AbortError，isInterrupted = true, status = 'interrupted'

// 续播（将已有 partial 作为起点继续）
await start({
  url: '/api/chat/resume',
  resumePrefix: content.value,
  body: { conversationId: conversationId.value },
})
```

---

## `createMarkdownStream` <Badge type="tip" text="v3" />

工厂式 API：**一次配置，全应用复用**。返回一个预注册好 blocks 的 `MarkdownRenderer` 组件 + parser + registry。

```typescript
// app/markdown.ts
import { createMarkdownStream, defineBlock } from '@krishanjinbo/vue-markdown-stream'
import JobCard from './blocks/JobCard.vue'
import SkillRadar from './blocks/SkillRadar.vue'

export const { MarkdownRenderer, parse, md, registry } = createMarkdownStream({
  blocks: [
    defineBlock({ name: 'job-card',    component: JobCard,    parseInfo: 'json' }),
    defineBlock({ name: 'skill-radar', component: SkillRadar, parseInfo: 'json' }),
  ],
  enableValidation: true,
})
```

```vue
<!-- 任意页面：无需再传 blocks -->
<script setup lang="ts">
import { MarkdownRenderer } from '@/app/markdown'
import { ref } from 'vue'
const content = ref('...')
</script>

<template>
  <MarkdownRenderer :content="content" streaming />
</template>
```

### 入参 `CreateMarkdownStreamOptions`

| 字段 | 类型 | 说明 |
|------|------|------|
| `blocks` | `BlockDefinition[]` | 预注册块（`defineBlock` 创建） |
| `components` | `ComponentMap` | 直接合并到 componentMap 的额外组件 |
| `propsSchemas` | `Record<string, ComponentPropsSchema>` | 额外 schemas |
| `enableValidation` | `boolean` | 是否启用 Props 校验（默认 `true`） |

### 返回值

| 属性 | 类型 | 说明 |
|------|------|------|
| `MarkdownRenderer` | `Component` | 预配置好的渲染组件（支持 `content` / `streaming` / `cursor` / 额外 `blocks` / `components` / `propsSchemas` props） |
| `parse` | `(content: string) => string` | 共享 parser |
| `md` | `MarkdownIt` | 底层 markdown-it 实例 |
| `registry` | `BlockRegistry` | 块注册中心 |

---

## `renderMarkdown`

向后兼容 v1 的快捷函数。

```typescript
import { renderMarkdown } from '@krishanjinbo/vue-markdown-stream'

const html: string = renderMarkdown('# Hello')
```

::: warning 已弃用
建议使用 `useMarkdownParser().parse()` 替代。
:::
