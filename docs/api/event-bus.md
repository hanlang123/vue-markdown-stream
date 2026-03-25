# 事件总线

## `createAgentEventBus` <Badge type="tip" text="v2" />

创建 Agent 事件总线实例。设计为工厂函数，支持多个 `MarkdownRenderer` 各自拥有独立的事件空间。

```typescript
import { createAgentEventBus } from '@krishanjinbo/vue-markdown-stream'

const eventBus = createAgentEventBus()
```

### 返回值

```typescript
interface AgentEventBus {
  emit(payload: Omit<AgentActionPayload, 'timestamp'>): void
  on(handler: AgentActionHandler): () => void   // 返回取消函数
  clearHistory(): void
  destroy(): void
  history: Readonly<Ref<AgentEventRecord[]>>
  lastEvent: Readonly<Ref<AgentActionPayload | null>>
}
```

::: tip
通常不需要直接使用 `createAgentEventBus`，`MarkdownRenderer` 内部会自动创建并管理。使用 `@agent:action` 事件即可。
:::

## 类型定义

### `AgentActionPayload`

```typescript
interface AgentActionPayload {
  blockId: string
  event: string
  componentType: string
  data: Record<string, unknown>
  timestamp: number
}
```

### `AgentActionHandler`

```typescript
type AgentActionHandler = (payload: AgentActionPayload) => void | Promise<void>
```
