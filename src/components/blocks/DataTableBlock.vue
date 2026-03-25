<script setup lang="ts">
import { ref, onMounted, onUpdated, computed } from 'vue'
import type { AgentEventBus } from '../../core/eventBus'

const props = withDefaults(defineProps<{
  sortable?: boolean
  filterable?: boolean
  pageSize?: number
  blockId?: string
  eventBus?: AgentEventBus
}>(), {
  sortable: false,
  filterable: false,
  pageSize: 10,
})

const headers = ref<string[]>([])
const rows = ref<string[][]>([])
const sortColumn = ref<number | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')
const filterText = ref('')
const slotContainer = ref<HTMLElement | null>(null)

let lastSlotHTML = ''

function parseSlot() {
  if (!slotContainer.value) return
  const html = slotContainer.value.innerHTML
  if (html === lastSlotHTML) return
  lastSlotHTML = html

  const table = slotContainer.value.querySelector('table')
  if (!table) return
  const ths = table.querySelectorAll('th')
  headers.value = Array.from(ths).map((th) => th.textContent?.trim() || '')
  const trs = table.querySelectorAll('tbody tr')
  rows.value = Array.from(trs).map((tr) =>
    Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.trim() || '')
  )
}

onMounted(parseSlot)
onUpdated(parseSlot)

const filteredRows = computed(() => {
  let result = [...rows.value]
  if (props.filterable && filterText.value) {
    const q = filterText.value.toLowerCase()
    result = result.filter((row) => row.some((cell) => cell.toLowerCase().includes(q)))
  }
  if (props.sortable && sortColumn.value !== null) {
    const col = sortColumn.value
    const dir = sortDir.value === 'asc' ? 1 : -1
    result.sort((a, b) => (a[col] ?? '').localeCompare(b[col] ?? '') * dir)
  }
  return result
})

function toggleSort(index: number) {
  if (!props.sortable) return
  if (sortColumn.value === index) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = index
    sortDir.value = 'asc'
  }
}
</script>

<template>
  <div class="datatable-block" style="margin: 12px 0; border: 1px solid #e8e8e8; border-radius: 10px; overflow: hidden;">
    <div ref="slotContainer" style="display: none;">
      <slot />
    </div>
    <div v-if="filterable" style="padding: 10px 14px; border-bottom: 1px solid #f0f0f0;">
      <input
        v-model="filterText"
        placeholder="搜索..."
        style="width: 100%; padding: 6px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; box-sizing: border-box;"
      />
    </div>
    <table v-if="headers.length" style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <thead>
        <tr>
          <th
            v-for="(header, i) in headers"
            :key="i"
            :style="{
              padding: '10px 14px',
              textAlign: 'left',
              background: '#FAFAFA',
              borderBottom: '1px solid #f0f0f0',
              cursor: sortable ? 'pointer' : 'default',
              userSelect: 'none',
              fontSize: '13px',
              fontWeight: 600,
              color: '#555',
            }"
            @click="toggleSort(i)"
          >
            {{ header }}
            <span v-if="sortable && sortColumn === i" style="margin-left: 4px;">
              {{ sortDir === 'asc' ? '↑' : '↓' }}
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, ri) in filteredRows" :key="ri">
          <td
            v-for="(cell, ci) in row"
            :key="ci"
            :style="{
              padding: '10px 14px',
              borderBottom: '1px solid #f5f5f5',
              color: '#333',
            }"
          >
            {{ cell }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
