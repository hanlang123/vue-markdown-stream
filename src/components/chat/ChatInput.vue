<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  /** 是否正在流式输出（决定按钮展示 Send/Stop） */
  isStreaming?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 占位符 */
  placeholder?: string
  /** 最大行数（auto-resize） */
  maxRows?: number
}>()

const emit = defineEmits<{
  (e: 'send', text: string): void
  (e: 'abort'): void
}>()

const text = ref('')
const textarea = ref<HTMLTextAreaElement | null>(null)

function autosize() {
  const el = textarea.value
  if (!el) return
  el.style.height = 'auto'
  const maxRows = props.maxRows ?? 6
  const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20
  const max = lineHeight * maxRows
  el.style.height = Math.min(el.scrollHeight, max) + 'px'
}

function send() {
  const v = text.value.trim()
  if (!v || props.disabled) return
  emit('send', v)
  text.value = ''
  setTimeout(autosize, 0)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    send()
  }
}
</script>

<template>
  <div class="vms-chat-input">
    <textarea
      ref="textarea"
      v-model="text"
      :placeholder="placeholder || '输入消息，回车发送，Shift+Enter 换行'"
      :aria-label="placeholder || '聊天输入框'"
      :disabled="disabled"
      class="vms-chat-textarea"
      rows="1"
      @input="autosize"
      @keydown="onKeydown"
    />
    <button
      v-if="isStreaming"
      class="vms-chat-btn is-stop"
      type="button"
      @click="emit('abort')"
    >
      <slot name="stop">停止</slot>
    </button>
    <button
      v-else
      class="vms-chat-btn is-send"
      type="button"
      :disabled="!text.trim() || disabled"
      @click="send"
    >
      <slot name="send">发送</slot>
    </button>
  </div>
</template>

<style scoped>
.vms-chat-input {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 12px;
  background: var(--vms-input-bg, rgba(255, 255, 255, 0.04));
  border: 1px solid var(--vms-input-border, rgba(255, 255, 255, 0.08));
  border-radius: 10px;
}
.vms-chat-textarea {
  flex: 1;
  resize: none;
  border: none;
  outline: none;
  background: transparent;
  color: var(--vms-text-primary, inherit);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  padding: 4px 0;
  max-height: 180px;
  overflow-y: auto;
}
.vms-chat-textarea::placeholder {
  color: var(--vms-text-secondary, rgba(255, 255, 255, 0.4));
}
.vms-chat-btn {
  flex-shrink: 0;
  padding: 6px 16px;
  border-radius: 6px;
  border: none;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.vms-chat-btn.is-send {
  background: var(--vms-accent, #00e0ff);
  color: var(--vms-accent-fg, #000);
}
.vms-chat-btn.is-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.vms-chat-btn.is-stop {
  background: var(--vms-warn-bg, rgba(245, 158, 11, 0.15));
  color: var(--vms-warn, #f59e0b);
  border: 1px solid var(--vms-warn-border, rgba(245, 158, 11, 0.3));
}
</style>
