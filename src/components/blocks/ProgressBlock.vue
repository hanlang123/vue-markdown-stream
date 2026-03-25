<script setup lang="ts">
import { computed } from 'vue'
import type { AgentEventBus } from '../../core/eventBus'

const props = withDefaults(defineProps<{
  value?: number
  max?: number
  label?: string
  status?: 'active' | 'success' | 'error'
  blockId?: string
  eventBus?: AgentEventBus
}>(), {
  value: 0,
  max: 100,
  status: 'active',
})

const percentage = computed(() =>
  Math.min(100, Math.max(0, (props.value / props.max) * 100))
)

const barColor = computed(() => ({
  active: '#5B4FC4',
  success: '#52c41a',
  error: '#F56C6C',
}[props.status]))
</script>

<template>
  <div class="progress-block" style="margin: 12px 0;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
      <div style="font-size: 14px; color: #333;">
        <slot />
      </div>
      <span style="font-size: 13px; color: #999; font-variant-numeric: tabular-nums;">
        {{ percentage.toFixed(0) }}%
      </span>
    </div>
    <div style="height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden;">
      <div
        :style="{
          width: percentage + '%',
          height: '100%',
          background: barColor,
          borderRadius: '4px',
          transition: 'width 0.3s ease',
        }"
      />
    </div>
  </div>
</template>
