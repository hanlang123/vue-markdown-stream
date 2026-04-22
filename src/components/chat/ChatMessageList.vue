<script setup lang="ts">
import { ref, watch, nextTick, type PropType } from 'vue'
import ChatMessage from './ChatMessage.vue'
import type { AgentStatusStep } from '../../composables/useAgentStream'
import type { BlockDefinition } from '../../core/blockRegistry'

/**
 * 简易消息项结构
 */
export interface ChatMessageItem {
  id?: string | number
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  isInterrupted?: boolean
  statusSteps?: AgentStatusStep[]
  agentStatus?: string
  author?: string
}

const props = defineProps({
  messages: {
    type: Array as PropType<ChatMessageItem[]>,
    required: true,
  },
  /** 自动滚到底部（默认开启） */
  autoScroll: { type: Boolean, default: true },
  showAvatar: { type: Boolean, default: false },
  cursor: { type: String, default: '▍' },
  blocks: {
    type: Array as PropType<BlockDefinition[]>,
    default: () => [],
  },
})

const emit = defineEmits<{
  (e: 'resume', index: number): void
  (e: 'agent:action', payload: unknown, index: number): void
}>()

const listRef = ref<HTMLElement | null>(null)

function scrollToBottom() {
  if (!props.autoScroll || !listRef.value) return
  nextTick(() => {
    if (listRef.value) {
      listRef.value.scrollTop = listRef.value.scrollHeight
    }
  })
}

watch(
  () => props.messages.map((m) => `${m.content.length}:${m.isStreaming}`).join('|'),
  () => scrollToBottom(),
  { flush: 'post' },
)
</script>

<template>
  <div ref="listRef" class="vms-chat-list">
    <div v-if="!messages.length" class="vms-chat-empty">
      <slot name="empty">
        <div class="vms-chat-empty-default">暂无消息</div>
      </slot>
    </div>

    <ChatMessage
      v-for="(msg, idx) in messages"
      :key="msg.id ?? idx"
      :role="msg.role"
      :content="msg.content"
      :is-streaming="msg.isStreaming"
      :is-interrupted="msg.isInterrupted"
      :status-steps="msg.statusSteps"
      :agent-status="msg.agentStatus"
      :author="msg.author"
      :show-avatar="showAvatar"
      :cursor="cursor"
      :blocks="blocks"
      @resume="emit('resume', idx)"
      @agent:action="(p) => emit('agent:action', p, idx)"
    />
  </div>
</template>

<style scoped>
.vms-chat-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  padding: 16px;
}
.vms-chat-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}
.vms-chat-empty-default {
  color: var(--vms-text-secondary, rgba(255, 255, 255, 0.5));
  font-size: 14px;
}
</style>
