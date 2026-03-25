import { ref, type Ref } from 'vue'
import type { AgentActionPayload } from '../core/eventBus'

/**
 * 便捷的 Agent 事件管理 Composable
 *
 * 使用方式:
 * ```vue
 * <script setup>
 * const { createHandler, serializeToMessage } = useAgentEvents()
 *
 * const handleAction = createHandler(async (payload) => {
 *   await sendToAgent(payload)
 * })
 * </script>
 *
 * <template>
 *   <MarkdownRenderer :content="text" @agent:action="handleAction" />
 * </template>
 * ```
 */
export function useAgentEvents() {
  const lastAction: Ref<AgentActionPayload | null> = ref(null)
  const actionHistory: Ref<AgentActionPayload[]> = ref([])
  const isProcessing = ref(false)

  /**
   * 处理 Agent 事件的通用 handler
   *
   * @param handler - 自定义处理逻辑（通常是发送给 Agent API）
   * @returns 绑定到 @agent:action 的事件处理函数
   */
  function createHandler(
    handler: (payload: AgentActionPayload) => void | Promise<void>,
  ) {
    return async (payload: AgentActionPayload) => {
      lastAction.value = payload
      actionHistory.value.push(payload)
      isProcessing.value = true

      try {
        await handler(payload)
      } finally {
        isProcessing.value = false
      }
    }
  }

  /**
   * 将 AgentActionPayload 序列化为可发送给 Agent 的文本消息
   */
  function serializeToMessage(payload: AgentActionPayload): string {
    const parts = [`[用户操作] ${payload.componentType}`]

    switch (payload.event) {
      case 'confirm':
        parts.push(`确认了操作: ${payload.data.action || ''}`)
        break
      case 'cancel':
        parts.push(`取消了操作: ${payload.data.action || ''}`)
        break
      case 'submit':
        parts.push(`提交了表单: ${JSON.stringify(payload.data.values || {})}`)
        break
      case 'select':
        parts.push(`选择了: ${JSON.stringify(payload.data.selectedIndices || [])}`)
        break
      case 'pill_click':
        parts.push(`点击了快捷操作: "${payload.data.text || ''}"`)
        break
      default:
        parts.push(`${payload.event}: ${JSON.stringify(payload.data)}`)
    }

    return parts.join(' — ')
  }

  return {
    lastAction,
    actionHistory,
    isProcessing,
    createHandler,
    serializeToMessage,
  }
}
