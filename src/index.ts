// ======== 核心组件 ========
export { default as MarkdownRenderer } from './components/MarkdownRenderer'

// ======== 内置块组件（支持 tree-shaking 单独引入） ========
export { default as AlertBlock } from './components/blocks/AlertBlock.vue'
export { default as DataCard } from './components/blocks/DataCard.vue'
export { default as ConfirmBlock } from './components/blocks/ConfirmBlock.vue'
export { default as SelectBlock } from './components/blocks/SelectBlock.vue'
export { default as FormBlock } from './components/blocks/FormBlock.vue'
export { default as ProgressBlock } from './components/blocks/ProgressBlock.vue'
export { default as DataTableBlock } from './components/blocks/DataTableBlock.vue'
export { default as ActionPills } from './components/blocks/ActionPills.vue'

// ======== Composables ========
export { useStreamingText } from './composables/useStreamingText'
export { useMarkdownParser, renderMarkdown } from './composables/useMarkdownParser'
export { useAgentEvents } from './composables/useAgentEvents'

// ======== Core ========
export { createAgentEventBus } from './core/eventBus'
export { validateProps, sanitizePayload, defaultSchemas } from './core/propValidator'
export { autoCloseContainers } from './core/autoCloseContainers'

// ======== Types ========
export type { AgentActionPayload, AgentEventBus, AgentActionHandler } from './core/eventBus'
export type { ComponentPropsSchema, PropRule } from './core/propValidator'
export type { ComponentMap, BlockBaseProps } from './types'
export { PROTOCOL_VERSION, SUPPORTED_BLOCKS } from './types/protocol'
