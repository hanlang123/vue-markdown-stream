<script setup lang="ts">
import { computed, ref } from 'vue'
import MarkdownRenderer from './MarkdownRenderer'
import { useStreamingText } from '../composables/useStreamingText'
import { useAgentEvents } from '../composables/useAgentEvents'
import type { AgentActionPayload } from '../core/eventBus'

const { text, isStreaming, startStream, stopStream, resetStream } = useStreamingText()
const { createHandler, serializeToMessage } = useAgentEvents()

// 打字机光标：仅在流式输出时显示
const displayText = computed(() =>
  isStreaming.value ? text.value + '▍' : text.value
)

// 事件日志
const eventLogs = ref<string[]>([])

const handleAction = createHandler(async (payload: AgentActionPayload) => {
  const message = serializeToMessage(payload)
  eventLogs.value.push(message)
})
</script>

<template>
  <div class="stream-page">
    <header class="stream-header">
      <h1 class="page-title">Agent UI Protocol v2</h1>
      <p class="page-subtitle">
        流式 Markdown 渲染 + Vue 组件块 + Agent 事件回传
      </p>

      <div class="controls">
        <button
          class="btn btn-primary"
          :disabled="isStreaming"
          @click="startStream"
        >
          {{ text ? '继续输出' : '开始流式输出' }}
        </button>
        <button
          class="btn btn-secondary"
          :disabled="!isStreaming"
          @click="stopStream"
        >
          暂停
        </button>
        <button
          class="btn btn-ghost"
          @click="resetStream(); eventLogs = []"
        >
          重置
        </button>
      </div>
    </header>

    <div class="stream-content">
      <MarkdownRenderer
        :content="displayText"
        @agent:action="handleAction"
      />
      <div v-if="!text" class="empty-hint">
        点击「开始流式输出」查看渲染效果
      </div>
    </div>

    <!-- Agent 事件日志面板 -->
    <div v-if="eventLogs.length > 0" class="event-panel">
      <h3 class="event-panel-title">Agent 事件日志</h3>
      <div class="event-list">
        <div
          v-for="(log, i) in eventLogs"
          :key="i"
          class="event-item"
        >
          {{ log }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stream-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 32px 24px 64px;
}

.stream-header {
  text-align: center;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.page-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px;
}

.page-subtitle {
  color: #6b7280;
  font-size: 0.95rem;
  margin: 0 0 20px;
}

.controls {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.btn {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 0.9em;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s;
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn-primary {
  background: #6366f1;
  color: #fff;
  border-color: #6366f1;
}
.btn-primary:not(:disabled):hover {
  background: #4f46e5;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border-color: #d1d5db;
}
.btn-secondary:not(:disabled):hover {
  background: #e5e7eb;
}

.btn-ghost {
  background: transparent;
  color: #6b7280;
  border-color: #e5e7eb;
}
.btn-ghost:not(:disabled):hover {
  background: #f9fafb;
}

.stream-content {
  min-height: 200px;
}

.empty-hint {
  text-align: center;
  color: #9ca3af;
  font-size: 0.9em;
  padding: 60px 0;
}

.event-panel {
  margin-top: 32px;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.event-panel-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #475569;
  margin: 0 0 12px;
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.event-item {
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.85em;
  color: #334155;
  font-family: 'SF Mono', 'Fira Code', monospace;
}
</style>
