<script setup lang="ts">
import { ref } from 'vue'
import type { AgentEventBus } from '../../core/eventBus'

const props = withDefaults(defineProps<{
  action?: string
  level?: 'info' | 'warning' | 'danger'
  confirmText?: string
  cancelText?: string
  blockId?: string
  eventBus?: AgentEventBus
}>(), {
  action: '',
  level: 'warning',
  confirmText: '确认',
  cancelText: '取消',
})

const emit = defineEmits<{
  'agent-action': [event: string, data: Record<string, unknown>]
}>()

const submitted = ref(false)
const result = ref<'confirmed' | 'cancelled' | null>(null)

function handleConfirm() {
  if (submitted.value) return
  submitted.value = true
  result.value = 'confirmed'
  emit('agent-action', 'confirm', {
    action: props.action,
    confirmed: true,
  })
}

function handleCancel() {
  if (submitted.value) return
  submitted.value = true
  result.value = 'cancelled'
  emit('agent-action', 'cancel', {
    action: props.action,
    confirmed: false,
  })
}

const levelColors = {
  info: { border: '#4472C4', bg: '#E8F0FE' },
  warning: { border: '#E6A23C', bg: '#FDF6EC' },
  danger: { border: '#F56C6C', bg: '#FEF0F0' },
}
</script>

<template>
  <div
    class="confirm-block"
    :style="{
      borderLeft: `4px solid ${levelColors[level].border}`,
      background: levelColors[level].bg,
      padding: '16px',
      borderRadius: '8px',
      margin: '12px 0',
    }"
  >
    <div class="confirm-content">
      <slot />
    </div>
    <div
      v-if="!submitted"
      style="display: flex; gap: 12px; margin-top: 12px;"
    >
      <button
        class="confirm-btn confirm-btn--primary"
        :style="{
          background: levelColors[level].border,
          color: '#fff',
          border: 'none',
          padding: '8px 20px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
        }"
        @click="handleConfirm"
      >
        {{ confirmText }}
      </button>
      <button
        class="confirm-btn confirm-btn--secondary"
        :style="{
          background: 'transparent',
          color: '#666',
          border: '1px solid #ddd',
          padding: '8px 20px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
        }"
        @click="handleCancel"
      >
        {{ cancelText }}
      </button>
    </div>
    <div
      v-else
      style="margin-top: 12px; font-size: 14px; color: #666;"
    >
      {{ result === 'confirmed' ? '\u2713 已确认' : '\u2717 已取消' }}
    </div>
  </div>
</template>
