<script setup lang="ts">
import { ref, onMounted, onUpdated } from 'vue'
import type { AgentEventBus } from '../../core/eventBus'

const props = withDefaults(defineProps<{
  id?: string
  submitText?: string
  layout?: 'vertical' | 'horizontal'
  blockId?: string
  eventBus?: AgentEventBus
}>(), {
  id: '',
  submitText: '提交',
  layout: 'vertical',
})

const emit = defineEmits<{
  'agent-action': [event: string, data: Record<string, unknown>]
}>()

interface FormField {
  name: string
  type: 'text' | 'textarea' | 'select' | 'checkbox'
  placeholder: string
  options?: string[]
}

const fields = ref<FormField[]>([])
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formData = ref<Record<string, any>>({})
const submitted = ref(false)

/**
 * 从 slot 内容解析表单字段定义
 * 格式: "- fieldName: type "placeholder""  或  "- fieldName: select ["opt1", "opt2"]"
 */
function parseFieldsFromSlot(slotEl: HTMLElement) {
  const items = slotEl.querySelectorAll('li')
  const parsed: FormField[] = []

  items.forEach((li) => {
    const text = li.textContent?.trim() || ''
    // 匹配: name: type "placeholder" 或 name: select ["opt1", "opt2"]
    const match = text.match(/^(\w+):\s*(text|textarea|select|checkbox)\s*(.*)$/)
    if (!match) return

    const name = match[1]!
    const type = match[2]! as FormField['type']
    const rest = match[3] || ''
    const field: FormField = { name, type, placeholder: '' }

    if (type === 'select') {
      // 解析 ["opt1", "opt2"]
      const optMatch = rest.match(/\[([^\]]+)\]/)
      if (optMatch) {
        field.options = optMatch[1]!.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''))
      }
    } else if (type === 'checkbox') {
      field.placeholder = rest.replace(/^["']|["']$/g, '').trim()
      formData.value[name!] = false
    } else {
      field.placeholder = rest.replace(/^["']|["']$/g, '').trim()
      formData.value[name!] = ''
    }

    parsed.push(field)
  })

  fields.value = parsed
}

const slotContainer = ref<HTMLElement | null>(null)

let lastSlotHTML = ''

function tryParseSlot() {
  if (!slotContainer.value) return
  const html = slotContainer.value.innerHTML
  if (html === lastSlotHTML) return
  lastSlotHTML = html
  parseFieldsFromSlot(slotContainer.value)
}

onMounted(tryParseSlot)
onUpdated(tryParseSlot)

function handleSubmit() {
  if (submitted.value) return
  submitted.value = true
  emit('agent-action', 'submit', {
    formId: props.id,
    values: { ...formData.value },
  })
}
</script>

<template>
  <div class="form-block" style="margin: 12px 0; border: 1px solid #e8e8e8; border-radius: 10px; padding: 16px;">
    <!-- 隐藏的 slot 用于解析字段定义 -->
    <div ref="slotContainer" style="display: none;">
      <slot />
    </div>

    <!-- 渲染的表单 -->
    <div v-if="!submitted" :style="{ display: 'flex', flexDirection: layout === 'vertical' ? 'column' : 'row', gap: '12px', flexWrap: 'wrap' }">
      <div
        v-for="field in fields"
        :key="field.name"
        style="display: flex; flex-direction: column; gap: 4px; min-width: 200px; flex: 1;"
      >
        <label style="font-size: 13px; color: #666; font-weight: 500;">{{ field.name }}</label>
        <input
          v-if="field.type === 'text'"
          v-model="formData[field.name]"
          :placeholder="field.placeholder"
          style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;"
        />
        <textarea
          v-else-if="field.type === 'textarea'"
          v-model="formData[field.name]"
          :placeholder="field.placeholder"
          style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; min-height: 80px; resize: vertical;"
        />
        <select
          v-else-if="field.type === 'select'"
          v-model="formData[field.name]"
          style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;"
        >
          <option value="" disabled>请选择</option>
          <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
        </select>
        <label v-else-if="field.type === 'checkbox'" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" v-model="formData[field.name]" />
          <span style="font-size: 14px;">{{ field.placeholder }}</span>
        </label>
      </div>
    </div>

    <button
      v-if="!submitted"
      style="margin-top: 14px; background: #5B4FC4; color: #fff; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-size: 14px;"
      @click="handleSubmit"
    >
      {{ submitText }}
    </button>

    <div v-else style="color: #52c41a; font-size: 14px;">✓ 已提交</div>
  </div>
</template>
