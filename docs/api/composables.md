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
const { parse, md } = useMarkdownParser()

const html: string = parse('# Hello\n::: alert info\n内容\n:::')
```

### 返回值

| 属性 | 类型 | 说明 |
|------|------|------|
| `parse` | `(content: string) => string` | 解析 Markdown（自动调用 autoCloseContainers） |
| `md` | `MarkdownIt` | 底层 markdown-it 实例，可用于进一步配置 |

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
