<script setup lang="ts">
import { ref, computed, onMounted, onUpdated } from 'vue'
import type { AgentEventBus } from '../../core/eventBus'

type ArtifactType = 'code' | 'html' | 'svg' | 'document' | 'mermaid' | 'text'

const props = withDefaults(defineProps<{
  type?: ArtifactType
  lang?: string
  title?: string
  blockId?: string
  eventBus?: AgentEventBus
}>(), {
  type: 'code',
  lang: '',
  title: '',
})

const emit = defineEmits<{
  'agent-action': [event: string, data: Record<string, unknown>]
}>()

const slotContainer = ref<HTMLElement | null>(null)
const rawContent = ref('')
const copied = ref(false)
const collapsed = ref(false)

let lastSlotHTML = ''

/**
 * 从 slot 容器中提取纯文本内容
 */
function parseSlot() {
  if (!slotContainer.value) return
  const html = slotContainer.value.innerHTML
  if (html === lastSlotHTML) return
  lastSlotHTML = html

  // 提取内容：对于 code 类型优先取 <code> 标签内容，否则取纯文本
  if (props.type === 'code') {
    const codeEl = slotContainer.value.querySelector('code')
    if (codeEl) {
      rawContent.value = codeEl.textContent || ''
    } else {
      const preEl = slotContainer.value.querySelector('pre')
      if (preEl) {
        rawContent.value = preEl.textContent || ''
      } else {
        rawContent.value = slotContainer.value.textContent || ''
      }
    }
  } else if (props.type === 'html' || props.type === 'svg') {
    // For html/svg, preserve the inner HTML
    rawContent.value = slotContainer.value.innerHTML
    // Try to extract from <p> tags which markdown-it may wrap
    const pEl = slotContainer.value.querySelector('p')
    if (pEl) {
      rawContent.value = pEl.innerHTML
    }
  } else {
    rawContent.value = slotContainer.value.innerHTML
  }
}

onMounted(parseSlot)
onUpdated(parseSlot)

const typeIcon = computed(() => {
  const icons: Record<ArtifactType, string> = {
    code: '📄',
    html: '🌐',
    svg: '🎨',
    document: '📝',
    mermaid: '📊',
    text: '📃',
  }
  return icons[props.type] || '📄'
})

const typeLabel = computed(() => {
  const labels: Record<ArtifactType, string> = {
    code: 'Code',
    html: 'HTML',
    svg: 'SVG',
    document: 'Document',
    mermaid: 'Mermaid',
    text: 'Text',
  }
  return labels[props.type] || 'Artifact'
})

const displayTitle = computed(() => props.title || `${typeLabel.value} Artifact`)

/**
 * 复制内容到剪贴板
 */
async function handleCopy() {
  const textToCopy = props.type === 'code'
    ? rawContent.value
    : slotContainer.value?.textContent || rawContent.value

  try {
    await navigator.clipboard.writeText(textToCopy)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // Fallback for non-secure contexts
    const textarea = document.createElement('textarea')
    textarea.value = textToCopy
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }

  emit('agent-action', 'copy', {
    type: props.type,
    title: displayTitle.value,
  })
}

/**
 * 下载内容为文件
 */
function handleDownload() {
  const content = props.type === 'code'
    ? rawContent.value
    : slotContainer.value?.textContent || rawContent.value

  const ext = getFileExtension()
  const filename = (props.title || 'artifact').replace(/\s+/g, '_') + ext
  const mimeType = getMimeType()

  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  emit('agent-action', 'download', {
    type: props.type,
    title: displayTitle.value,
    filename,
  })
}

function getFileExtension(): string {
  if (props.type === 'code') {
    const langExtMap: Record<string, string> = {
      javascript: '.js', typescript: '.ts', python: '.py', java: '.java',
      go: '.go', rust: '.rs', c: '.c', cpp: '.cpp', csharp: '.cs',
      ruby: '.rb', php: '.php', swift: '.swift', kotlin: '.kt',
      html: '.html', css: '.css', json: '.json', yaml: '.yaml',
      sql: '.sql', bash: '.sh', shell: '.sh', markdown: '.md',
      xml: '.xml', vue: '.vue', jsx: '.jsx', tsx: '.tsx',
    }
    return langExtMap[props.lang] || '.txt'
  }
  const typeExtMap: Record<string, string> = {
    html: '.html', svg: '.svg', document: '.md', mermaid: '.mmd', text: '.txt',
  }
  return typeExtMap[props.type] || '.txt'
}

function getMimeType(): string {
  const mimeMap: Record<string, string> = {
    code: 'text/plain', html: 'text/html', svg: 'image/svg+xml',
    document: 'text/markdown', mermaid: 'text/plain', text: 'text/plain',
  }
  return mimeMap[props.type] || 'text/plain'
}

function toggleCollapse() {
  collapsed.value = !collapsed.value
  emit('agent-action', 'toggle', {
    type: props.type,
    title: displayTitle.value,
    collapsed: collapsed.value,
  })
}
</script>

<template>
  <div class="artifact-block" :class="`artifact-${props.type}`">
    <!-- Header -->
    <div class="artifact-header" @click="toggleCollapse">
      <div class="artifact-header-left">
        <span class="artifact-icon">{{ typeIcon }}</span>
        <span class="artifact-title">{{ displayTitle }}</span>
        <span class="artifact-badge">{{ typeLabel }}</span>
        <span v-if="props.lang && props.type === 'code'" class="artifact-lang">{{ props.lang }}</span>
      </div>
      <div class="artifact-actions" @click.stop>
        <button
          class="artifact-btn"
          :title="copied ? '已复制' : '复制'"
          @click="handleCopy"
        >
          {{ copied ? '✅' : '📋' }}
        </button>
        <button
          class="artifact-btn"
          title="下载"
          @click="handleDownload"
        >
          ⬇️
        </button>
        <button
          class="artifact-btn artifact-btn-toggle"
          :title="collapsed ? '展开' : '折叠'"
          @click="toggleCollapse"
        >
          {{ collapsed ? '▶' : '▼' }}
        </button>
      </div>
    </div>

    <!-- Hidden slot for parsing -->
    <div ref="slotContainer" style="display: none;">
      <slot />
    </div>

    <!-- Content -->
    <div v-show="!collapsed" class="artifact-content">
      <!-- Code type: syntax highlighted block -->
      <template v-if="props.type === 'code'">
        <pre class="artifact-code"><code>{{ rawContent }}</code></pre>
      </template>

      <!-- HTML type: live preview -->
      <template v-else-if="props.type === 'html'">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="artifact-html-preview" v-html="rawContent" />
      </template>

      <!-- SVG type: rendered SVG -->
      <template v-else-if="props.type === 'svg'">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="artifact-svg-preview" v-html="rawContent" />
      </template>

      <!-- Document / Mermaid / Text: rendered content -->
      <template v-else>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="artifact-document" v-html="rawContent" />
      </template>
    </div>
  </div>
</template>

<style scoped>
.artifact-block {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  margin: 16px 0;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s;
}

.artifact-block:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Header */
.artifact-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
  cursor: pointer;
  user-select: none;
}

.artifact-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
}

.artifact-icon {
  font-size: 1em;
  flex-shrink: 0;
}

.artifact-title {
  font-weight: 600;
  font-size: 0.88em;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.artifact-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  background: #e0e7ff;
  color: #4338ca;
  border-radius: 12px;
  font-size: 0.72em;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.artifact-lang {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 10px;
  font-size: 0.7em;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Actions */
.artifact-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.artifact-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.82em;
  transition: background 0.15s;
  padding: 0;
}

.artifact-btn:hover {
  background: rgba(0, 0, 0, 0.07);
}

.artifact-btn-toggle {
  font-size: 0.7em;
  color: #64748b;
}

/* Content area */
.artifact-content {
  max-height: 500px;
  overflow: auto;
}

/* Code type */
.artifact-code {
  margin: 0;
  padding: 14px 16px;
  background: #1e293b;
  color: #e2e8f0;
  font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace;
  font-size: 0.85em;
  line-height: 1.65;
  overflow-x: auto;
  tab-size: 2;
  white-space: pre;
}

.artifact-code code {
  font-family: inherit;
  background: none;
  padding: 0;
  color: inherit;
}

/* HTML preview */
.artifact-html-preview {
  padding: 16px;
  background: #fff;
  font-size: 0.92em;
  line-height: 1.6;
}

/* SVG preview */
.artifact-svg-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: #fafafa;
  min-height: 80px;
}

.artifact-svg-preview :deep(svg) {
  max-width: 100%;
  height: auto;
}

/* Document */
.artifact-document {
  padding: 14px 16px;
  font-size: 0.92em;
  line-height: 1.7;
  color: #374151;
}

.artifact-document :deep(p) {
  margin: 6px 0;
}

.artifact-document :deep(ul),
.artifact-document :deep(ol) {
  padding-left: 20px;
  margin: 6px 0;
}

.artifact-document :deep(code) {
  background: rgba(0, 0, 0, 0.07);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 0.88em;
}

.artifact-document :deep(h1),
.artifact-document :deep(h2),
.artifact-document :deep(h3) {
  margin: 12px 0 6px;
}

/* Type-specific border accents */
.artifact-code-type { border-left: 3px solid #6366f1; }
.artifact-html { border-left: 3px solid #f97316; }
.artifact-svg { border-left: 3px solid #8b5cf6; }
.artifact-document { border-left: 3px solid #06b6d4; }
.artifact-mermaid { border-left: 3px solid #10b981; }
.artifact-text { border-left: 3px solid #6b7280; }
</style>
