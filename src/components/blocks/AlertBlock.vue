<script setup lang="ts">
type AlertType = 'info' | 'success' | 'warning' | 'error'

const props = withDefaults(
  defineProps<{ type?: AlertType }>(),
  { type: 'info' }
)

const iconMap: Record<AlertType, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌',
}

const labelMap: Record<AlertType, string> = {
  info: '提示',
  success: '成功',
  warning: '注意',
  error: '错误',
}
</script>

<template>
  <div class="alert-block" :class="`alert-${props.type}`">
    <div class="alert-header">
      <span class="alert-icon">{{ iconMap[props.type] }}</span>
      <span class="alert-label">{{ labelMap[props.type] }}</span>
    </div>
    <div class="alert-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.alert-block {
  border-left: 4px solid;
  border-radius: 6px;
  padding: 12px 16px;
  margin: 16px 0;
  background: var(--alert-bg);
  border-color: var(--alert-border);
}

.alert-info    { --alert-bg: #eff6ff; --alert-border: #3b82f6; --alert-label-color: #1d4ed8; }
.alert-success { --alert-bg: #f0fdf4; --alert-border: #22c55e; --alert-label-color: #15803d; }
.alert-warning { --alert-bg: #fffbeb; --alert-border: #f59e0b; --alert-label-color: #b45309; }
.alert-error   { --alert-bg: #fef2f2; --alert-border: #ef4444; --alert-label-color: #b91c1c; }

.alert-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 0.9em;
  color: var(--alert-label-color);
}

.alert-icon { font-size: 1em; }

.alert-body {
  font-size: 0.92em;
  line-height: 1.7;
  color: #374151;
}

.alert-body :deep(p) {
  margin: 4px 0;
}

.alert-body :deep(code) {
  background: rgba(0, 0, 0, 0.07);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 0.88em;
}
</style>
