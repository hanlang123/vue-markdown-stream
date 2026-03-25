<script setup lang="ts">
import { ref, onMounted, onUpdated } from 'vue'
import type { AgentEventBus } from '../../core/eventBus'

const props = withDefaults(defineProps<{
  mode?: 'single' | 'multiple'
  columns?: number
  maxSelect?: number
  blockId?: string
  eventBus?: AgentEventBus
}>(), {
  mode: 'single',
  columns: 2,
  maxSelect: 1,
})

const emit = defineEmits<{
  'agent-action': [event: string, data: Record<string, unknown>]
}>()

interface SelectOption {
  title: string
  subtitle: string
}

const options = ref<SelectOption[]>([])
const selected = ref<Set<number>>(new Set())
const confirmed = ref(false)
const slotContainer = ref<HTMLElement | null>(null)

let lastSlotHTML = ''

function parseSlot() {
  if (!slotContainer.value) return
  const html = slotContainer.value.innerHTML
  if (html === lastSlotHTML) return
  lastSlotHTML = html

  const items = slotContainer.value.querySelectorAll('li')
  options.value = Array.from(items).map((li) => {
    const text = li.textContent?.trim() || ''
    const parts = text.split('|').map((s) => s.trim())
    return {
      title: parts[0] || text,
      subtitle: parts[1] || '',
    }
  })
}

onMounted(parseSlot)
onUpdated(parseSlot)

function toggleSelect(index: number) {
  if (confirmed.value) return
  if (props.mode === 'single') {
    selected.value = new Set([index])
  } else {
    const s = new Set(selected.value)
    if (s.has(index)) {
      s.delete(index)
    } else if (s.size < props.maxSelect) {
      s.add(index)
    }
    selected.value = s
  }
}

function handleConfirm() {
  if (confirmed.value || selected.value.size === 0) return
  confirmed.value = true
  emit('agent-action', 'select', {
    selectedIndices: Array.from(selected.value),
    selectedOptions: Array.from(selected.value).map((i) => options.value[i]),
  })
}
</script>

<template>
  <div class="select-block" style="margin: 12px 0;">
    <!-- 隐藏的 slot 用于解析选项 -->
    <div ref="slotContainer" style="display: none;">
      <slot />
    </div>

    <!-- 渲染的可选项 -->
    <div
      :style="{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '10px',
      }"
    >
      <div
        v-for="(opt, i) in options"
        :key="i"
        :style="{
          padding: '12px 16px',
          border: selected.has(i) ? '2px solid #5B4FC4' : '1px solid #e8e8e8',
          borderRadius: '8px',
          cursor: confirmed ? 'default' : 'pointer',
          background: selected.has(i) ? '#F5F3FF' : '#fff',
          opacity: confirmed && !selected.has(i) ? 0.5 : 1,
          transition: 'all 0.15s',
        }"
        @click="toggleSelect(i)"
      >
        <div style="font-weight: 500; font-size: 14px; color: #333;">{{ opt.title }}</div>
        <div v-if="opt.subtitle" style="font-size: 12px; color: #999; margin-top: 4px;">{{ opt.subtitle }}</div>
      </div>
    </div>

    <button
      v-if="!confirmed && selected.size > 0"
      style="
        margin-top: 12px;
        background: #5B4FC4;
        color: #fff;
        border: none;
        padding: 10px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
      "
      @click="handleConfirm"
    >
      确认选择
    </button>
    <div
      v-if="confirmed"
      style="margin-top: 12px; font-size: 14px; color: #52c41a;"
    >
      ✓ 已选择
    </div>
  </div>
</template>
