<script setup lang="ts">
import { computed } from 'vue'
import MarkdownRenderer from './MarkdownRenderer'
import { useStreamingText } from '../composables/useStreamingText'

const { text, isStreaming, startStream, stopStream, resetStream } = useStreamingText()

// 打字机光标：仅在流式输出时显示
const displayText = computed(() =>
  isStreaming.value ? text.value + '▍' : text.value
)
</script>

<template>
  <div class="stream-page">
    <header class="stream-header">
      <h1 class="page-title">流式 Markdown 渲染</h1>
      <p class="page-subtitle">
        使用 <code>markdown-it-container</code> 将特定块渲染为 Vue 组件
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
          @click="resetStream"
        >
          重置
        </button>
      </div>
    </header>

    <div class="stream-content">
      <MarkdownRenderer :content="displayText" />
      <div v-if="!text" class="empty-hint">
        点击「开始流式输出」查看渲染效果
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

.page-subtitle code {
  background: #f3f4f6;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.9em;
  color: #7c3aed;
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
</style>
