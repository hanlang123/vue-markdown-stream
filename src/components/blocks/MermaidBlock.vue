<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'

const props = defineProps<{
  code?: string
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const svgContent = ref('')
const error = ref<string | null>(null)
const loading = ref(true)

/** 唯一 ID 计数器（Mermaid 渲染需要唯一 ID） */
let idCounter = 0

async function renderMermaid(code: string) {
  if (!code.trim()) {
    svgContent.value = ''
    loading.value = false
    return
  }

  loading.value = true
  error.value = null

  try {
    // 动态导入 mermaid（peerDependency，可能未安装）
    const mermaid = await import('mermaid')
    const mermaidApi = mermaid.default

    // 初始化（仅首次）
    mermaidApi.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'strict',
    })

    const id = `mermaid-block-${++idCounter}`
    const { svg } = await mermaidApi.render(id, code.trim())
    svgContent.value = svg
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // 区分模块未安装和渲染错误
    if (msg.includes('Cannot find module') || msg.includes('Failed to fetch') || msg.includes('Failed to resolve')) {
      error.value = '[MermaidBlock] mermaid 未安装。请运行: npm install mermaid'
    } else {
      error.value = msg
    }
    svgContent.value = ''
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (props.code) {
    renderMermaid(props.code)
  } else {
    loading.value = false
  }
})

watch(
  () => props.code,
  async (newCode) => {
    if (newCode) {
      await nextTick()
      renderMermaid(newCode)
    } else {
      svgContent.value = ''
      error.value = null
      loading.value = false
    }
  }
)
</script>

<template>
  <div ref="containerRef" class="mermaid-block">
    <!-- 加载状态 -->
    <div v-if="loading" class="mermaid-loading">
      <span class="mermaid-loading-icon">⏳</span>
      <span>正在渲染图表…</span>
    </div>

    <!-- 渲染成功 -->
    <div v-else-if="svgContent && !error" class="mermaid-svg" v-html="svgContent" />

    <!-- 错误降级：显示原始代码 -->
    <div v-else-if="error" class="mermaid-error">
      <div class="mermaid-error-header">
        <span>⚠️ Mermaid 渲染失败</span>
      </div>
      <pre class="mermaid-error-detail">{{ error }}</pre>
      <pre v-if="props.code" class="mermaid-fallback-code"><code>{{ props.code }}</code></pre>
    </div>

    <!-- 无内容 -->
    <div v-else class="mermaid-empty">
      <span>（空 Mermaid 图表）</span>
    </div>
  </div>
</template>

<style scoped>
.mermaid-block {
  margin: 1em 0;
  border-radius: 8px;
  overflow-x: auto;
  background: #fafafa;
  border: 1px solid #e5e7eb;
}

.mermaid-svg {
  display: flex;
  justify-content: center;
  padding: 16px;
}

.mermaid-svg :deep(svg) {
  max-width: 100%;
  height: auto;
}

.mermaid-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: #6b7280;
  font-size: 0.9em;
}

.mermaid-loading-icon {
  animation: mermaid-pulse 1.5s ease-in-out infinite;
}

@keyframes mermaid-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.mermaid-error {
  padding: 12px 16px;
  background: #fef2f2;
  border-color: #fecaca;
}

.mermaid-error-header {
  font-weight: 600;
  font-size: 0.9em;
  color: #b91c1c;
  margin-bottom: 8px;
}

.mermaid-error-detail {
  font-size: 0.82em;
  color: #991b1b;
  background: rgba(0, 0, 0, 0.04);
  padding: 8px 12px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 4px 0 8px;
  white-space: pre-wrap;
}

.mermaid-fallback-code {
  background: #1e1e2e;
  color: #cdd6f4;
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 0.85em;
  overflow-x: auto;
  margin: 0;
}

.mermaid-fallback-code code {
  background: none;
  border: none;
  padding: 0;
  color: inherit;
}

.mermaid-empty {
  padding: 24px;
  text-align: center;
  color: #9ca3af;
  font-size: 0.9em;
}
</style>
