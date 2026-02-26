// 核心组件
export { default as MarkdownRenderer } from './components/MarkdownRenderer'
export { default as AlertBlock } from './components/blocks/AlertBlock.vue'
export { default as DataCard } from './components/blocks/DataCard.vue'

// Composables
export { renderMarkdown } from './composables/useMarkdownParser'
export { useStreamingText } from './composables/useStreamingText'

// 工具函数
export { autoCloseContainers } from './utils/autoClose'
export { htmlToVnodes } from './utils/htmlToVnodes'
export type { ComponentMap } from './utils/htmlToVnodes'
