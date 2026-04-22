# 从 0 到聊天应用（10 行接入）

本指南演示如何用 `@krishanjinbo/vue-markdown-stream` v3 的开箱能力，**10 行内**搭建一个支持自定义块、流式传输、Agent 状态时间轴、中断/恢复的 AI 聊天界面。

## 安装

```bash
npm install @krishanjinbo/vue-markdown-stream markdown-it markdown-it-container
```

## 一、最小聊天页（~10 行）

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useAgentStream, defineBlock } from '@krishanjinbo/vue-markdown-stream'
import { ChatMessageList, ChatInput, type ChatMessageItem } from '@krishanjinbo/vue-markdown-stream/chat'
import '@krishanjinbo/vue-markdown-stream/style.css'
import JobCard from './blocks/JobCard.vue'

const messages = ref<ChatMessageItem[]>([])
const { content, isStreaming, statusSteps, isInterrupted, start, abort } = useAgentStream()

const blocks = [defineBlock({ name: 'job-card', component: JobCard, parseInfo: 'json' })]

async function send(text: string) {
  const ai: ChatMessageItem = { role: 'assistant', content: '', isStreaming: true, statusSteps: [] }
  messages.value.push({ role: 'user', content: text }, ai)
  await start({
    url: '/api/chat/stream',
    body: { message: text },
    onMessage: () => { ai.content = content.value; ai.statusSteps = statusSteps.value },
  })
  ai.isStreaming = false
  ai.isInterrupted = isInterrupted.value
}
</script>

<template>
  <ChatMessageList :messages="messages" :blocks="blocks" />
  <ChatInput :is-streaming="isStreaming" @send="send" @abort="abort" />
</template>
```

就这些。下面逐项解释 v3 带来的能力。

## 二、`defineBlock`：一次注册，到处可用

旧版需要改 6 处文件才能加一个自定义块。现在只要：

```ts
import { defineBlock } from '@krishanjinbo/vue-markdown-stream'
import JobCardBlock from './JobCardBlock.vue'
import SkillRadarBlock from './SkillRadarBlock.vue'

const blocks = [
  defineBlock({ name: 'job-card',    component: JobCardBlock,    parseInfo: 'json' }),
  defineBlock({ name: 'skill-radar', component: SkillRadarBlock, parseInfo: 'json' }),
  defineBlock({ name: 'alert',       component: AlertBlock,      parseInfo: 'attrs', override: true }),
]
```

传给 `<MarkdownRenderer :blocks>` 即可。`defineBlock` 同时完成：
- markdown-it container 注册
- componentMap 注册
- propsSchemas 注册
- `data-*` / `data-props` 属性序列化

### `parseInfo` 策略

| 策略 | 语法示例 | 组件收到的 props |
|---|---|---|
| `attrs`（默认） | `::: confirm action=delete level=danger` | `{ action: 'delete', level: 'danger' }` |
| `json` | `::: job-card {"title":"前端","salary":{...}}` | `{ title: '前端', salary: {...} }` |
| `title` | `::: card 技术栈对比` | `{ title: '技术栈对比' }` |
| 函数 | `(raw) => ({ __props: {...} })` | 自定义；`__props` 对象会进 `data-props` |

## 三、`useAgentStream`：替代手写 SSE

```ts
const { content, isStreaming, statusSteps, conversationId, start, abort, reset } = useAgentStream()

await start({
  url: '/api/chat',
  body: { message, sessionId },
  // parser: sseParser | ndjsonParser | textParser | 自定义 framing
  resumePrefix: partialContent, // 断点续播
  onMessage(full, delta) { /* 流式 chunk 到达 */ },
  onStatus(s) { /* 阶段变化 */ },
  onStep(step) { /* agent 步骤更新 */ },
  onMeta({ conversationId }) { /* 服务端元信息 */ },
  onDone() {},
  onError(err) {},
})

abort()   // 中断
reset()   // 清空
```

默认 SSE 帧格式约定：payload JSON 字段 `content` / `delta` 追加到正文，`status` 变更状态，`step` 推入时间轴，`conversationId` 进 meta，`[DONE]` 或 `done:true` 结束。想用 NDJSON 或自定义 framing 直接传 `parser`。

## 四、`<MarkdownRenderer :streaming>`：自带光标与节流

```vue
<MarkdownRenderer :content="text" streaming cursor="▍" :blocks="blocks" />
```

- `streaming=true`：末尾自动追加 `cursor` 字符；用 `requestAnimationFrame` 节流解析，减少流式 tick 下的重解析。
- 组件块使用稳定 key（`data-id` > `data-props` hash > 位置 key），图表类组件不会因为流式更新而频繁重建。
- JSON props 内部缓存：相同原文返回相同对象引用，彻底消除无意义重渲染。

## 五、`createMarkdownStream`：全应用一次配置

```ts
// app/markdown.ts
import { createMarkdownStream, defineBlock } from '@krishanjinbo/vue-markdown-stream'
import JobCard from './JobCard.vue'

export const { MarkdownRenderer, parse, registry } = createMarkdownStream({
  blocks: [defineBlock({ name: 'job-card', component: JobCard, parseInfo: 'json' })],
})
```

```vue
<script setup>
import { MarkdownRenderer } from '@/app/markdown'
</script>

<template>
  <MarkdownRenderer :content="text" streaming />
</template>
```

## 六、`htmlToVnodes`：完全自定义壳层

需要完全自管渲染、不用 `<MarkdownRenderer>` 时：

```ts
import { useMarkdownParser, htmlToVnodes, createAgentEventBus } from '@krishanjinbo/vue-markdown-stream'

const { parse } = useMarkdownParser({ blocks })
const bus = createAgentEventBus()

const vnodes = computed(() =>
  htmlToVnodes(parse(content.value), {
    componentMap,
    schemas,
    eventBus: bus,
    stableKey: true,
    propsCache, // Map 跨次调用复用，保证 JSON props 引用稳定
  }),
)
```

## 七、Chat 壳层组件（可选）

从 `@krishanjinbo/vue-markdown-stream/chat` 子入口按需引入：

- `<ChatMessage>`：user/assistant 两态、流式光标、思考三点、中断条
- `<ChatMessageList>`：自动滚底、空状态 slot
- `<AgentStatusTimeline>`：从 `useAgentStream.statusSteps` 直连
- `<ChatInput>`：多行输入 / Enter 发送 / Shift+Enter 换行 / 流式中断

样式通过 CSS 变量暴露，无需 `:deep` 覆盖：

```css
:root {
  --vms-accent: #00e0ff;
  --vms-text-primary: rgba(255,255,255,.9);
  --vms-assistant-bg: rgba(255,255,255,.02);
  /* ...详见 ChatMessage.vue / ChatInput.vue */
}
```

## 八、`generateBlockPromptDocs`：协议与渲染器同源

把注册表直接导出成 system prompt 片段，让 LLM 产生合法协议文本：

```ts
import { generateBlockPromptDocs } from '@krishanjinbo/vue-markdown-stream'

const promptSection = generateBlockPromptDocs(registry.all())
// → # Available Markdown Blocks ...
```

## 对比：旧版 vs v3

| 场景 | v2 用户要写 | v3 用户要写 |
|---|---|---|
| 注册 5 个自定义 JSON 块 | 新建 MarkdownIt + 5× `md.use(container)` + 手写 `customHtmlToVnodes` + propsCache + stableKey | 5 行 `defineBlock({ parseInfo: 'json' })` |
| 流式 SSE 通信 | 自己写 `useSSE`（fetch + ReadableStream + 帧解析 + resume + statusSteps） | `useAgentStream()` |
| 聊天消息 UI | 自己写 ChatMessage + 思考动画 + 中断条 + timeline | `<ChatMessageList>` |
| 流式光标 | `computed(() => isStreaming ? content + '▍' : content)` | `<MarkdownRenderer streaming />` |

参考 job-radar 的 `StreamRenderer.vue`（240 行）可以缩成约 20 行 `<MarkdownRenderer :blocks :streaming />`。
