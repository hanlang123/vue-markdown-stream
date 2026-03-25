<script setup lang="ts">
import { ref, onMounted, onUpdated } from 'vue'
import type { AgentEventBus } from '../../core/eventBus'

withDefaults(defineProps<{
  layout?: 'inline' | 'wrap'
  blockId?: string
  eventBus?: AgentEventBus
}>(), {
  layout: 'inline',
})

const emit = defineEmits<{
  'agent-action': [event: string, data: Record<string, unknown>]
}>()

const pills = ref<string[]>([])
const clickedIndex = ref<number | null>(null)
const slotContainer = ref<HTMLElement | null>(null)

let lastSlotHTML = ''

function parseSlot() {
  if (!slotContainer.value) return
  const html = slotContainer.value.innerHTML
  if (html === lastSlotHTML) return
  lastSlotHTML = html

  const items = slotContainer.value.querySelectorAll('li')
  pills.value = Array.from(items).map((li) => li.textContent?.trim() || '')
}

onMounted(parseSlot)
onUpdated(parseSlot)

function handleClick(text: string, index: number) {
  if (clickedIndex.value !== null) return
  clickedIndex.value = index
  emit('agent-action', 'pill_click', {
    text,
    index,
  })
}
</script>

<template>
  <div class="action-pills" style="margin: 12px 0;">
    <div ref="slotContainer" style="display: none;">
      <slot />
    </div>
    <div :style="{ display: 'flex', flexWrap: layout === 'wrap' ? 'wrap' : 'nowrap', gap: '8px', overflowX: 'auto' }">
      <button
        v-for="(pill, i) in pills"
        :key="i"
        :disabled="clickedIndex !== null"
        :style="{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          background: clickedIndex === i ? '#EDE9FE' : '#F5F5F5',
          border: clickedIndex === i ? '1px solid #5B4FC4' : '1px solid #E8E8E8',
          borderRadius: '20px',
          cursor: clickedIndex !== null ? 'default' : 'pointer',
          fontSize: '13px',
          color: clickedIndex === i ? '#5B4FC4' : '#555',
          whiteSpace: 'nowrap',
          opacity: clickedIndex !== null && clickedIndex !== i ? 0.5 : 1,
          transition: 'all 0.2s',
        }"
        @click="handleClick(pill, i)"
      >
        {{ pill }}
      </button>
    </div>
  </div>
</template>
