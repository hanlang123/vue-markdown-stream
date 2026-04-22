<script setup lang="ts">
import type { AgentStatusStep } from '../../composables/useAgentStream'

defineProps<{
  steps: AgentStatusStep[]
  currentStatus?: string
}>()

function formatTime(ts?: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="vms-status-timeline">
    <div
      v-for="step in steps"
      :key="step.id"
      class="vms-status-step"
      :class="[`is-${step.status}`, { 'is-current': !step.finishedAt }]"
    >
      <div class="vms-status-dot" />
      <div class="vms-status-body">
        <div class="vms-status-label">{{ step.label || step.status }}</div>
        <div v-if="step.detail" class="vms-status-detail">{{ step.detail }}</div>
        <div class="vms-status-time">
          {{ formatTime(step.startedAt) }}
          <template v-if="step.finishedAt"> → {{ formatTime(step.finishedAt) }}</template>
        </div>
      </div>
    </div>
    <div v-if="!steps.length && currentStatus" class="vms-status-empty">{{ currentStatus }}</div>
  </div>
</template>

<style scoped>
.vms-status-timeline {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 8px 0;
  padding: 10px 12px;
  border-left: 2px solid var(--vms-accent, #00e0ff);
  background: var(--vms-step-bg, rgba(0, 224, 255, 0.04));
  border-radius: 4px;
  font-size: 12px;
}
.vms-status-step {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.vms-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vms-step-dot, #00e0ff);
  margin-top: 5px;
  flex-shrink: 0;
}
.vms-status-step.is-current .vms-status-dot {
  animation: vms-pulse 1.4s ease-in-out infinite;
}
.vms-status-step.is-failed .vms-status-dot { background: #ef4444; }
.vms-status-step.is-completed .vms-status-dot { background: #10b981; }
.vms-status-step.is-interrupted .vms-status-dot { background: #f59e0b; }

.vms-status-body { flex: 1; min-width: 0; }
.vms-status-label {
  font-weight: 500;
  color: var(--vms-text-primary, rgba(255, 255, 255, 0.9));
}
.vms-status-detail {
  margin-top: 2px;
  color: var(--vms-text-secondary, rgba(255, 255, 255, 0.6));
  word-break: break-word;
}
.vms-status-time {
  margin-top: 2px;
  font-size: 11px;
  color: var(--vms-text-tertiary, rgba(255, 255, 255, 0.4));
  font-variant-numeric: tabular-nums;
}
.vms-status-empty {
  color: var(--vms-text-secondary, rgba(255, 255, 255, 0.6));
  font-style: italic;
}

@keyframes vms-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.3); }
}
</style>
