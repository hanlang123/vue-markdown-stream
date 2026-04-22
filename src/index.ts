// ======== 核心组件 ========
export { default as MarkdownRenderer, AGENT_EVENT_BUS_KEY } from './components/MarkdownRenderer'

// ======== 内置块组件（支持 tree-shaking 单独引入） ========
export {
  AlertBlock,
  DataCard,
  ConfirmBlock,
  SelectBlock,
  FormBlock,
  ProgressBlock,
  DataTableBlock,
  ActionPills,
  ArtifactBlock,
  builtinComponentMap,
  createBuiltinBlocks,
} from './components/blocks'

// ======== Composables ========
export { useStreamingText } from './composables/useStreamingText'
export {
  useMarkdownParser,
  renderMarkdown,
  type MarkdownParserOptions,
} from './composables/useMarkdownParser'
export { useAgentEvents } from './composables/useAgentEvents'
export {
  useAgentStream,
  sseParser,
  ndjsonParser,
  textParser,
  type StreamEvent,
  type FrameParser,
  type StartStreamOptions,
  type AgentStatus,
  type AgentStatusStep,
} from './composables/useAgentStream'
export {
  createMarkdownStream,
  type CreateMarkdownStreamOptions,
} from './composables/createMarkdownStream'

// ======== Core ========
export { createAgentEventBus } from './core/eventBus'
export {
  validateProps,
  sanitizePayload,
  defaultSchemas,
} from './core/propValidator'
export { autoCloseContainers } from './core/autoCloseContainers'
export {
  defineBlock,
  createBlockRegistry,
  defaultComponentName,
  parseAttrString,
  attrsToDataHtml,
  applyParseInfo,
  JSON_PAYLOAD_KEY,
  type BlockDefinition,
  type BlockRegistry,
  type ParseInfoStrategy,
} from './core/blockRegistry'
export {
  htmlToVnodes,
  resolveJsonProps,
  type HtmlToVnodesOptions,
} from './core/htmlToVnodes'
export { generateBlockPromptDocs } from './core/promptDocs'

// ======== Types ========
export type {
  AgentActionPayload,
  AgentEventBus,
  AgentActionHandler,
} from './core/eventBus'
export type { ComponentPropsSchema, PropRule } from './core/propValidator'
export type { ComponentMap, BlockBaseProps } from './types'
export { PROTOCOL_VERSION, SUPPORTED_BLOCKS } from './types/protocol'
