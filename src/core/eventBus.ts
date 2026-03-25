import { ref, readonly, type Ref } from 'vue'

/**
 * Agent 事件载荷
 */
export interface AgentActionPayload {
  /** 触发事件的组件块 ID（自动生成或 data-id 指定） */
  blockId: string
  /** 事件类型：confirm / cancel / submit / select / click 等 */
  event: string
  /** 组件类型：ConfirmBlock / SelectBlock / FormBlock 等 */
  componentType: string
  /** 事件携带的数据 */
  data: Record<string, unknown>
  /** 事件时间戳 */
  timestamp: number
}

/**
 * Agent 事件历史记录
 */
export interface AgentEventRecord extends AgentActionPayload {
  /** 是否已被宿主应用消费 */
  consumed: boolean
}

export type AgentActionHandler = (payload: AgentActionPayload) => void | Promise<void>

/**
 * 创建 Agent 事件总线实例
 *
 * 设计为工厂函数而非单例，支持多个 MarkdownRenderer 实例
 * 各自拥有独立的事件空间
 */
export function createAgentEventBus() {
  const handlers: Set<AgentActionHandler> = new Set()
  const history: Ref<AgentEventRecord[]> = ref([])
  const lastEvent: Ref<AgentActionPayload | null> = ref(null)

  /**
   * 组件内部调用：触发 Agent 事件
   */
  function emit(payload: Omit<AgentActionPayload, 'timestamp'>) {
    const fullPayload: AgentActionPayload = {
      ...payload,
      timestamp: Date.now(),
    }

    // 记录历史
    history.value.push({ ...fullPayload, consumed: false })
    lastEvent.value = fullPayload

    // 通知所有监听器
    handlers.forEach((handler) => {
      try {
        handler(fullPayload)
      } catch (err) {
        console.error('[AgentEventBus] Handler error:', err)
      }
    })
  }

  /**
   * 宿主应用调用：监听 Agent 事件
   */
  function on(handler: AgentActionHandler) {
    handlers.add(handler)
    return () => handlers.delete(handler)  // 返回取消函数
  }

  /**
   * 清空事件历史
   */
  function clearHistory() {
    history.value = []
    lastEvent.value = null
  }

  /**
   * 销毁事件总线
   */
  function destroy() {
    handlers.clear()
    clearHistory()
  }

  return {
    emit,
    on,
    clearHistory,
    destroy,
    history: readonly(history),
    lastEvent: readonly(lastEvent),
  }
}

export type AgentEventBus = ReturnType<typeof createAgentEventBus>
