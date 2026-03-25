/**
 * Agent UI Protocol 版本
 */
export const PROTOCOL_VERSION = '2.0.0'

/**
 * 支持的容器块类型
 */
export const SUPPORTED_BLOCKS = [
  'alert', 'card',              // v1 已有
  'confirm', 'select', 'form',  // v2 交互组件
  'progress', 'datatable',      // v2 展示组件
  'actions',                    // v2 快捷操作
] as const

export type SupportedBlock = typeof SUPPORTED_BLOCKS[number]
