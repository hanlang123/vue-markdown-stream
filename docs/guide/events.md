# 事件系统

v2 新增 **AgentEventBus** 事件总线，让交互组件（Confirm、Select、Form、ActionPills）能将用户操作回传给宿主应用，宿主应用再转发给 Agent。

## 基本用法

```vue
<script setup lang="ts">
import { MarkdownRenderer } from '@krishanjinbo/vue-markdown-stream'
import type { AgentActionPayload } from '@krishanjinbo/vue-markdown-stream'

function handleAction(payload: AgentActionPayload) {
  console.log(payload.componentType)  // 'ConfirmBlock'
  console.log(payload.event)          // 'confirm'
  console.log(payload.data)           // { action: 'delete_user', confirmed: true }
}
</script>

<template>
  <MarkdownRenderer :content="text" @agent:action="handleAction" />
</template>
```

## AgentActionPayload 结构

```typescript
interface AgentActionPayload {
  blockId: string           // 组件块实例 ID
  event: string             // 事件类型：confirm / cancel / submit / select / pill_click
  componentType: string     // 组件名：ConfirmBlock / SelectBlock / FormBlock / ActionPills
  data: Record<string, unknown>  // 事件携带的数据
  timestamp: number         // 时间戳
}
```

## useAgentEvents Composable

提供便捷的事件管理和消息序列化：

```vue
<script setup lang="ts">
import { MarkdownRenderer, useAgentEvents } from '@krishanjinbo/vue-markdown-stream'

const { createHandler, serializeToMessage, lastAction, isProcessing } = useAgentEvents()

const handleAction = createHandler(async (payload) => {
  // 1. 序列化为可读文本
  const message = serializeToMessage(payload)
  // "[用户操作] ConfirmBlock — 确认了操作: delete_user"

  // 2. 发送给 Agent API
  await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ query: message }),
  })
})
</script>

<template>
  <MarkdownRenderer :content="text" @agent:action="handleAction" />
</template>
```

## 对接 Dify 示例

```typescript
const handleAction = createHandler(async (payload) => {
  const message = serializeToMessage(payload)

  const response = await fetch('/api/v1/chat-messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_KEY',
    },
    body: JSON.stringify({
      query: message,
      response_mode: 'streaming',
      conversation_id: conversationId.value,
      user: 'user-123',
    }),
  })

  // 流式读取 Agent 响应...
})
```

## 事件流程

```
用户点击 ConfirmBlock 的「确认」按钮
  → 组件 emit('agent-action', 'confirm', { action, confirmed: true })
  → MarkdownRenderer 的 onAgent-action 回调
  → AgentEventBus.emit(payload)
  → MarkdownRenderer emit('agent:action', payload)
  → 宿主应用 handleAction(payload)
  → serializeToMessage → 发送给 Agent API
```
