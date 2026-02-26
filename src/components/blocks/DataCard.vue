<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <div class="data-card">
    <div v-if="title" class="card-header">
      <span class="card-icon">📋</span>
      <span class="card-title">{{ title }}</span>
    </div>
    <div class="card-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.data-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  margin: 16px 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  background: #fff;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  font-size: 0.9em;
  color: #374151;
}

.card-icon { font-size: 1em; }

.card-body {
  padding: 14px 16px;
  font-size: 0.93em;
  line-height: 1.7;
  color: #374151;
}

.card-body :deep(p) {
  margin: 4px 0;
}

.card-body :deep(ul),
.card-body :deep(ol) {
  padding-left: 20px;
  margin: 6px 0;
}

.card-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9em;
}

.card-body :deep(th),
.card-body :deep(td) {
  border: 1px solid #e5e7eb;
  padding: 6px 10px;
  text-align: left;
}

.card-body :deep(th) {
  background: #f3f4f6;
  font-weight: 600;
}

.card-body :deep(code) {
  background: rgba(0, 0, 0, 0.07);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 0.88em;
}
</style>
