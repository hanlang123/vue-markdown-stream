<script setup lang="ts">
import { computed } from 'vue'
// 直接引用源文件，VitePress 构建时会正确处理
import MarkdownRenderer from '../../../src/components/MarkdownRenderer'
import { useStreamingText } from '../../../src/composables/useStreamingText'

const { text, isStreaming, startStream, stopStream, resetStream } = useStreamingText()
const displayText = computed(() => (isStreaming.value ? text.value + '▍' : text.value))
</script>

<template>
  <div class="demo-wrapper">
    <div class="demo-controls">
      <button class="demo-btn primary" :disabled="isStreaming" @click="startStream">
        {{ text ? '▶ 继续' : '▶ 开始演示' }}
      </button>
      <button class="demo-btn secondary" :disabled="!isStreaming" @click="stopStream">⏸ 暂停</button>
      <button class="demo-btn ghost" @click="resetStream">↺ 重置</button>
    </div>
    <div class="demo-output">
      <MarkdownRenderer :content="displayText" />
      <p v-if="!text" class="demo-hint">点击「开始演示」查看流式渲染效果</p>
    </div>
  </div>
</template>

<style scoped>
.demo-wrapper {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  margin: 16px 0;
}

.demo-controls {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}

.demo-btn {
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 0.85em;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s;
  font-family: inherit;
}

.demo-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.demo-btn.primary {
  background: #6366f1;
  color: #fff;
}
.demo-btn.primary:not(:disabled):hover {
  background: #4f46e5;
}

.demo-btn.secondary {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-divider);
}
.demo-btn.secondary:not(:disabled):hover {
  background: var(--vp-c-bg-alt);
}

.demo-btn.ghost {
  background: transparent;
  color: var(--vp-c-text-2);
  border-color: var(--vp-c-divider);
}
.demo-btn.ghost:not(:disabled):hover {
  background: var(--vp-c-bg-soft);
}

.demo-output {
  padding: 20px 24px;
  min-height: 120px;
}

.demo-hint {
  text-align: center;
  color: var(--vp-c-text-3);
  font-size: 0.9em;
  padding: 40px 0;
  margin: 0;
}
</style>
