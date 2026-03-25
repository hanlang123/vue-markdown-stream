import type { Component } from 'vue'
import type { AgentEventBus } from '../core/eventBus'

/**
 * 组件注册表类型
 */
export type ComponentMap = Record<string, Component>

/**
 * 块组件 Props 基础接口
 * 所有内置块组件都继承此接口
 */
export interface BlockBaseProps {
  /** 块实例唯一 ID（自动生成或 data-id 指定） */
  blockId?: string
  /** 事件总线引用（由 MarkdownRenderer 注入） */
  eventBus?: AgentEventBus
}
