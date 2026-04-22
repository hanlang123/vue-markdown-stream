/**
 * Chat 壳层子模块 —— 可选的"参考实现 + 可复用组件"
 *
 * 保持 `@krishanjinbo/vue-markdown-stream` 主入口的纯渲染定位，
 * 需要 chat UI 时再按需从 `@krishanjinbo/vue-markdown-stream/chat` 引入。
 */
export {
  ChatMessage,
  ChatMessageList,
  ChatInput,
  AgentStatusTimeline,
  type ChatMessageItem,
} from './components/chat'
