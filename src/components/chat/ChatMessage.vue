<script setup lang="ts">
import { computed } from 'vue'
import MarkdownRenderer from '../MarkdownRenderer'
import AgentStatusTimeline from './AgentStatusTimeline.vue'
import type { AgentStatusStep } from '../../composables/useAgentStream'
import type { BlockDefinition } from '../../core/blockRegistry'
import type { ComponentMap } from '../../types'

/**
 * 单条聊天消息组件
 *
 * - 用户消息：纯文本 + 右对齐徽标
 * - 助手消息：<MarkdownRenderer> 流式渲染 + 思考中三点 + 中断条 + Agent 状态 timeline
 * - 样式通过 CSS 变量暴露，不依赖外部 `:deep()`
 */
const props = defineProps<{
  /** 消息角色 */
  role: 'user' | 'assistant'
  /** 消息内容（Markdown 文本） */
  content: string
  /** 是否正在流式输出 */
  isStreaming?: boolean
  /** 是否被用户中断 */
  isInterrupted?: boolean
  /** Agent 执行步骤 */
  statusSteps?: AgentStatusStep[]
  /** 当前 Agent 状态 */
  agentStatus?: string
  /** 作者名（角标文案） */
  author?: string
  /** 用户头像/图标 slot 用（可选） */
  showAvatar?: boolean
  /** 流式光标字符 */
  cursor?: string
  /** 传给 MarkdownRenderer 的 blocks */
  blocks?: BlockDefinition[]
  /** 传给 MarkdownRenderer 的 components */
  components?: ComponentMap
}>()

const emit = defineEmits<{
  (e: 'resume'): void
  (e: 'agent:action', payload: unknown): void
}>()

const isUser = computed(() => props.role === 'user')
const showTimeline = computed(
  () => !isUser.value && props.statusSteps && props.statusSteps.length > 0,
)
const showThinking = computed(
  () => !isUser.value && props.isStreaming && !props.content,
)
</script>

<template>
  <div
    class="vms-chat-message"
    :class="{
      'is-user': isUser,
      'is-assistant': !isUser,
      'is-interrupted': isInterrupted,
    }"
  >
    <div v-if="showAvatar" class="vms-chat-avatar">
      <slot name="avatar">
        <div class="vms-chat-avatar-default">{{ isUser ? 'U' : 'A' }}</div>
      </slot>
    </div>

    <div class="vms-chat-body">
      <div v-if="author || isUser" class="vms-chat-author">
        {{ author || (isUser ? 'You' : 'Assistant') }}
      </div>

      <AgentStatusTimeline
        v-if="showTimeline"
        :steps="statusSteps!"
        :current-status="agentStatus"
      />

      <div class="vms-chat-content">
        <div v-if="isUser" class="vms-chat-user-text">{{ content }}</div>
        <template v-else>
          <div v-if="showThinking" class="vms-chat-thinking">
            <span class="vms-chat-dot" />
            <span class="vms-chat-dot" />
            <span class="vms-chat-dot" />
          </div>
          <MarkdownRenderer
            v-else
            :content="content"
            :streaming="!!isStreaming"
            :cursor="cursor ?? '▍'"
            :blocks="blocks || []"
            :components="components || {}"
            @agent:action="(p) => emit('agent:action', p)"
          />
        </template>
      </div>

      <div v-if="isInterrupted && !isStreaming" class="vms-chat-interrupted">
        <span class="vms-chat-interrupted-hint">⏸ 输出已中断</span>
        <button class="vms-chat-resume-btn" @click="emit('resume')">
          <slot name="resume-label">继续生成</slot>
        </button>
      </div>

      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.vms-chat-message {
  display: flex;
  gap: 12px;
  padding: 16px 0;
  color: var(--vms-text-primary, inherit);
}
.vms-chat-message.is-assistant {
  background: var(--vms-assistant-bg, transparent);
}
.vms-chat-avatar {
  flex-shrink: 0;
}
.vms-chat-avatar-default {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--vms-avatar-bg, rgba(0, 224, 255, 0.12));
  color: var(--vms-accent, #00e0ff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
}
.vms-chat-body {
  flex: 1;
  min-width: 0;
}
.vms-chat-author {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--vms-text-primary, inherit);
}
.vms-chat-content {
  font-size: 14px;
  line-height: 1.7;
}
.vms-chat-user-text {
  white-space: pre-wrap;
  word-break: break-word;
}
.vms-chat-thinking {
  display: flex;
  gap: 4px;
  padding: 8px 0;
}
.vms-chat-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--vms-text-secondary, rgba(255, 255, 255, 0.4));
  animation: vms-thinking 1.4s ease-in-out infinite;
}
.vms-chat-dot:nth-child(2) { animation-delay: 0.2s; }
.vms-chat-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes vms-thinking {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}

.vms-chat-interrupted {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding: 6px 10px;
  background: var(--vms-warn-bg, rgba(245, 158, 11, 0.08));
  border: 1px solid var(--vms-warn-border, rgba(245, 158, 11, 0.2));
  border-radius: 6px;
  font-size: 12px;
}
.vms-chat-interrupted-hint {
  color: var(--vms-warn, #f59e0b);
}
.vms-chat-resume-btn {
  padding: 3px 10px;
  border: 1px solid var(--vms-accent-border, rgba(0, 224, 255, 0.3));
  border-radius: 4px;
  background: var(--vms-accent-bg, rgba(0, 224, 255, 0.08));
  color: var(--vms-accent, #00e0ff);
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}
.vms-chat-resume-btn:hover {
  background: var(--vms-accent-bg-hover, rgba(0, 224, 255, 0.15));
}
</style>
