# Agent UI Protocol — 升级设计方案

> 将 vue-markdown-stream 从 "流式 Markdown 渲染器" 升级为 "Agent UI Protocol —— LLM 可控的前端组件渲染协议"

## 一、升级概览

### 1.1 当前架构（v1.x）

```
流式 chunk
  → autoCloseContainers()       补全未闭合 ::: 块
  → markdown-it + container     输出含 <vue-block> 的 HTML
  → DOMParser                   HTML → DOM 树
  → h() VNode 构建              <vue-block> → Vue 组件 VNode
  → MarkdownRenderer            渲染输出
```

**当前能力**：
- ✅ 流式打字机渲染
- ✅ :::alert / :::card 渲染为 Vue 组件
- ✅ 自定义块组件扩展（ComponentMap）
- ✅ autoCloseContainers 中间态补全
- ❌ 组件无法向 Agent 回传事件
- ❌ 没有内置 Agent 交互组件
- ❌ 没有 Props 安全校验
- ❌ 没有组件生命周期管理

### 1.2 目标架构（v2.x）

```
流式 chunk
  → autoCloseContainers()       补全未闭合 ::: 块（增强版）
  → markdown-it + container     输出含 <vue-block> 的 HTML
  → DOMParser                   HTML → DOM 树
  → PropValidator               Props 白名单校验 + 清洗（新增）
  → h() VNode 构建              <vue-block> → Vue 组件 VNode + 事件绑定（增强）
  → AgentEventBus               组件事件 → 宿主应用回调（新增）
  → MarkdownRenderer            渲染输出 + @agent:action 事件（增强）
```

### 1.3 设计原则

1. **向后兼容**：v1.x 的所有用法在 v2.x 中零改动可用
2. **渐进增强**：Event Bus、内置组件、安全层均为可选特性
3. **LLM 友好**：所有协议语法都是自然 Markdown，LLM 无需特殊训练
4. **轻量优先**：保持 ~40KB 的 bundle 增量，内置组件支持 tree-shaking

---

## 二、目录结构设计

基于当前项目结构，新增模块用 `[NEW]` 标注：

```
src/
├── components/
│   ├── MarkdownRenderer.ts          # 增强：注入 eventBus、支持 @agent:action
│   ├── blocks/
│   │   ├── AlertBlock.vue           # 已有
│   │   ├── DataCard.vue             # 已有
│   │   ├── ConfirmBlock.vue         # [NEW] 确认操作组件
│   │   ├── SelectBlock.vue          # [NEW] 选择/消歧组件
│   │   ├── FormBlock.vue            # [NEW] 动态表单组件
│   │   ├── ProgressBlock.vue        # [NEW] 进度展示组件
│   │   ├── DataTableBlock.vue       # [NEW] 数据表格组件
│   │   ├── ActionPills.vue          # [NEW] 快捷操作气泡
│   │   └── index.ts                 # [NEW] 统一导出 + 默认 ComponentMap
│   └── __tests__/                   # [NEW] 组件单元测试
├── composables/
│   ├── useMarkdownParser.ts         # 增强：注册新容器块
│   ├── useStreamingText.ts          # 已有
│   └── useAgentEvents.ts            # [NEW] Agent 事件管理 composable
├── core/
│   ├── eventBus.ts                  # [NEW] Agent 事件总线
│   ├── propValidator.ts             # [NEW] Props 白名单校验
│   ├── propSanitizer.ts             # [NEW] Props 值清洗
│   ├── autoCloseContainers.ts       # 已有（从原文件中提取，增强）
│   └── domToVNode.ts                # 已有（从 MarkdownRenderer 中提取，增强）
├── types/
│   ├── index.ts                     # [NEW] 统一类型定义
│   ├── events.ts                    # [NEW] 事件类型
│   ├── blocks.ts                    # [NEW] 块组件类型
│   └── protocol.ts                  # [NEW] 协议类型
├── utils/
│   └── helpers.ts                   # [NEW] 工具函数
└── index.ts                         # 增强：导出新模块
```

---

## 三、核心模块设计

### 3.1 Agent 事件总线（AgentEventBus）

**文件**: `src/core/eventBus.ts`

这是整个升级的核心——让组件能够向 Agent 回传事件。

```typescript
// src/core/eventBus.ts

import { ref, readonly, type Ref } from 'vue'

/**
 * Agent 事件载荷
 */
export interface AgentActionPayload {
  /** 触发事件的组件块 ID（自动生成或 data-id 指定） */
  blockId: string
  /** 事件类型：confirm / cancel / submit / select / click 等 */
  event: string
  /** 组件类型：ConfirmBlock / SelectBlock / FormBlock 等 */
  componentType: string
  /** 事件携带的数据 */
  data: Record<string, unknown>
  /** 事件时间戳 */
  timestamp: number
}

/**
 * Agent 事件历史记录
 */
export interface AgentEventRecord extends AgentActionPayload {
  /** 是否已被宿主应用消费 */
  consumed: boolean
}

export type AgentActionHandler = (payload: AgentActionPayload) => void | Promise<void>

/**
 * 创建 Agent 事件总线实例
 *
 * 设计为工厂函数而非单例，支持多个 MarkdownRenderer 实例
 * 各自拥有独立的事件空间
 */
export function createAgentEventBus() {
  const handlers: Set<AgentActionHandler> = new Set()
  const history: Ref<AgentEventRecord[]> = ref([])
  const lastEvent: Ref<AgentActionPayload | null> = ref(null)

  /**
   * 组件内部调用：触发 Agent 事件
   */
  function emit(payload: Omit<AgentActionPayload, 'timestamp'>) {
    const fullPayload: AgentActionPayload = {
      ...payload,
      timestamp: Date.now(),
    }

    // 记录历史
    history.value.push({ ...fullPayload, consumed: false })
    lastEvent.value = fullPayload

    // 通知所有监听器
    handlers.forEach((handler) => {
      try {
        handler(fullPayload)
      } catch (err) {
        console.error('[AgentEventBus] Handler error:', err)
      }
    })
  }

  /**
   * 宿主应用调用：监听 Agent 事件
   */
  function on(handler: AgentActionHandler) {
    handlers.add(handler)
    return () => handlers.delete(handler)  // 返回取消函数
  }

  /**
   * 清空事件历史
   */
  function clearHistory() {
    history.value = []
    lastEvent.value = null
  }

  /**
   * 销毁事件总线
   */
  function destroy() {
    handlers.clear()
    clearHistory()
  }

  return {
    emit,
    on,
    clearHistory,
    destroy,
    history: readonly(history),
    lastEvent: readonly(lastEvent),
  }
}

export type AgentEventBus = ReturnType<typeof createAgentEventBus>
```

### 3.2 Props 安全层

**文件**: `src/core/propValidator.ts`

LLM 输出不可信，必须校验和清洗 Props。

```typescript
// src/core/propValidator.ts

/**
 * 单个 prop 的校验规则
 */
export interface PropRule {
  type: 'string' | 'number' | 'boolean' | 'enum'
  required?: boolean
  default?: unknown
  enum?: string[]            // type 为 'enum' 时的允许值列表
  maxLength?: number         // type 为 'string' 时的最大长度
  min?: number               // type 为 'number' 时的最小值
  max?: number               // type 为 'number' 时的最大值
}

/**
 * 组件的 Props Schema 定义
 */
export interface ComponentPropsSchema {
  /** 允许的 props 白名单 */
  allowed: Record<string, PropRule>
  /** 全局黑名单（会覆盖 allowed 中同名属性） */
  blocked?: string[]
}

/**
 * 全局默认黑名单 — 这些属性绝不允许从 LLM 输出传入组件
 */
const GLOBAL_BLOCKED_PROPS = [
  'onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur',
  'onsubmit', 'onchange', 'oninput', 'onkeydown', 'onkeyup', 'onkeypress',
  'href', 'src', 'action', 'formaction', 'srcdoc',
  'innerHTML', 'outerHTML', 'dangerouslySetInnerHTML',
  'style',  // 防止通过 style 注入
  'is',     // 防止动态组件注入
]

/**
 * 默认的内置组件 Schema 注册表
 */
export const defaultSchemas: Record<string, ComponentPropsSchema> = {
  ConfirmBlock: {
    allowed: {
      action: { type: 'string', required: true, maxLength: 100 },
      level: { type: 'enum', enum: ['info', 'warning', 'danger'], default: 'warning' },
      confirmText: { type: 'string', default: '确认', maxLength: 20 },
      cancelText: { type: 'string', default: '取消', maxLength: 20 },
    },
  },
  SelectBlock: {
    allowed: {
      mode: { type: 'enum', enum: ['single', 'multiple'], default: 'single' },
      columns: { type: 'number', default: 2, min: 1, max: 4 },
      maxSelect: { type: 'number', default: 1, min: 1, max: 20 },
    },
  },
  FormBlock: {
    allowed: {
      id: { type: 'string', required: true, maxLength: 50 },
      submitText: { type: 'string', default: '提交', maxLength: 20 },
      layout: { type: 'enum', enum: ['vertical', 'horizontal'], default: 'vertical' },
    },
  },
  ProgressBlock: {
    allowed: {
      value: { type: 'number', required: true, min: 0, max: 100 },
      max: { type: 'number', default: 100, min: 1 },
      label: { type: 'string', maxLength: 100 },
      status: { type: 'enum', enum: ['active', 'success', 'error'], default: 'active' },
    },
  },
  DataTableBlock: {
    allowed: {
      sortable: { type: 'boolean', default: false },
      filterable: { type: 'boolean', default: false },
      pageSize: { type: 'number', default: 10, min: 5, max: 100 },
    },
  },
  ActionPills: {
    allowed: {
      layout: { type: 'enum', enum: ['inline', 'wrap'], default: 'inline' },
    },
  },
  // AlertBlock 和 DataCard 保持兼容，不加校验限制
  AlertBlock: { allowed: { type: { type: 'enum', enum: ['info', 'success', 'warning', 'error'], default: 'info' } } },
  DataCard: { allowed: { title: { type: 'string', maxLength: 100 } } },
}

/**
 * 校验并清洗从 data-* 属性提取的 props
 *
 * @param componentName - 组件名称
 * @param rawProps - 从 data-* 提取的原始 props（全部为 string 类型）
 * @param schemas - Schema 注册表（可自定义扩展）
 * @returns 校验通过的 props 对象
 */
export function validateProps(
  componentName: string,
  rawProps: Record<string, string>,
  schemas: Record<string, ComponentPropsSchema> = defaultSchemas,
): Record<string, unknown> {
  const schema = schemas[componentName]
  const result: Record<string, unknown> = {}

  // 无 schema 的组件：只做全局黑名单过滤，props 原样透传（向后兼容）
  if (!schema) {
    for (const [key, value] of Object.entries(rawProps)) {
      if (!GLOBAL_BLOCKED_PROPS.includes(key.toLowerCase())) {
        result[key] = value
      }
    }
    return result
  }

  const blocked = new Set([
    ...GLOBAL_BLOCKED_PROPS,
    ...(schema.blocked || []),
  ])

  // 1. 过滤黑名单
  const filtered: Record<string, string> = {}
  for (const [key, value] of Object.entries(rawProps)) {
    if (!blocked.has(key.toLowerCase())) {
      filtered[key] = value
    }
  }

  // 2. 按 schema 校验 + 类型转换
  for (const [propName, rule] of Object.entries(schema.allowed)) {
    const rawValue = filtered[propName]

    if (rawValue === undefined || rawValue === '') {
      if (rule.required) {
        console.warn(`[PropValidator] Missing required prop "${propName}" for ${componentName}`)
      }
      if (rule.default !== undefined) {
        result[propName] = rule.default
      }
      continue
    }

    // 类型转换 + 校验
    switch (rule.type) {
      case 'string':
        let strVal = String(rawValue)
        if (rule.maxLength && strVal.length > rule.maxLength) {
          strVal = strVal.slice(0, rule.maxLength)
        }
        result[propName] = strVal
        break

      case 'number':
        const numVal = Number(rawValue)
        if (isNaN(numVal)) {
          result[propName] = rule.default ?? 0
        } else {
          let clamped = numVal
          if (rule.min !== undefined) clamped = Math.max(clamped, rule.min)
          if (rule.max !== undefined) clamped = Math.min(clamped, rule.max)
          result[propName] = clamped
        }
        break

      case 'boolean':
        result[propName] = rawValue === 'true' || rawValue === '1' || rawValue === 'yes'
        break

      case 'enum':
        if (rule.enum?.includes(rawValue)) {
          result[propName] = rawValue
        } else {
          result[propName] = rule.default ?? rule.enum?.[0]
        }
        break
    }
  }

  return result
}

/**
 * 清洗事件 payload —— 防止原型链污染和函数注入
 */
export function sanitizePayload(payload: unknown): Record<string, unknown> {
  try {
    // JSON 序列化/反序列化：递归移除函数、Symbol、undefined、循环引用
    return JSON.parse(JSON.stringify(payload))
  } catch {
    return {}
  }
}
```

### 3.3 MarkdownRenderer 增强

**文件**: `src/components/MarkdownRenderer.ts`

核心改动：注入 eventBus、VNode 构建时绑定事件、暴露 `@agent:action`。

```typescript
// src/components/MarkdownRenderer.ts（关键改动部分）

import {
  defineComponent, h, watch, ref, provide, onBeforeUnmount,
  type PropType, type VNode
} from 'vue'
import { useMarkdownParser } from '../composables/useMarkdownParser'
import { createAgentEventBus, type AgentEventBus, type AgentActionPayload } from '../core/eventBus'
import { validateProps, sanitizePayload, type ComponentPropsSchema, defaultSchemas } from '../core/propValidator'

// 内置组件
import AlertBlock from './blocks/AlertBlock.vue'
import DataCard from './blocks/DataCard.vue'
import ConfirmBlock from './blocks/ConfirmBlock.vue'
import SelectBlock from './blocks/SelectBlock.vue'
import FormBlock from './blocks/FormBlock.vue'
import ProgressBlock from './blocks/ProgressBlock.vue'
import DataTableBlock from './blocks/DataTableBlock.vue'
import ActionPills from './blocks/ActionPills.vue'

// 类型
import type { ComponentMap } from '../types'

// Provide/Inject key
export const AGENT_EVENT_BUS_KEY = Symbol('agentEventBus')

/**
 * 默认组件注册表（内置组件 + 用户扩展）
 */
const builtinComponentMap: ComponentMap = {
  AlertBlock,
  DataCard,
  ConfirmBlock,
  SelectBlock,
  FormBlock,
  ProgressBlock,
  DataTableBlock,
  ActionPills,
}

export default defineComponent({
  name: 'MarkdownRenderer',

  props: {
    /** Markdown 内容（支持流式追加） */
    content: {
      type: String,
      required: true,
    },
    /**
     * 自定义组件注册表（与内置组件合并，用户组件优先）
     */
    components: {
      type: Object as PropType<ComponentMap>,
      default: () => ({}),
    },
    /**
     * [v2 新增] 自定义 Props Schema（与默认 Schema 合并）
     */
    propsSchemas: {
      type: Object as PropType<Record<string, ComponentPropsSchema>>,
      default: () => ({}),
    },
    /**
     * [v2 新增] 是否启用 Props 安全校验（默认启用）
     */
    enableValidation: {
      type: Boolean,
      default: true,
    },
  },

  emits: {
    /**
     * [v2 新增] Agent 操作事件
     *
     * 当任何内置或自定义块组件触发用户交互时，
     * 通过此事件通知宿主应用，宿主应用负责将其转发给 Agent
     */
    'agent:action': (payload: AgentActionPayload) => true,
  },

  setup(props, { emit }) {
    // 合并组件注册表
    const mergedComponentMap = {
      ...builtinComponentMap,
      ...props.components,
    }

    // 合并 Props Schema
    const mergedSchemas = {
      ...defaultSchemas,
      ...props.propsSchemas,
    }

    // 创建事件总线
    const eventBus = createAgentEventBus()

    // 事件总线 → emit 到宿主
    eventBus.on((payload) => {
      emit('agent:action', payload)
    })

    // 通过 provide 注入给所有子组件
    provide(AGENT_EVENT_BUS_KEY, eventBus)

    // Markdown 解析器
    const { parse } = useMarkdownParser()
    const vnodes = ref<VNode[]>([])

    // 自增的块 ID（用于没有指定 data-id 的组件）
    let blockIdCounter = 0

    /**
     * 核心：将 DOM 节点递归转换为 VNode
     * 增强点：vue-block 节点注入 eventBus + Props 校验 + 事件绑定
     */
    function domNodeToVNode(node: Node): VNode | string | null {
      // 文本节点
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || null
      }

      // 元素节点
      if (node.nodeType !== Node.ELEMENT_NODE) return null
      const el = node as HTMLElement
      const tagName = el.tagName.toLowerCase()

      // ========== vue-block 组件节点 ==========
      if (tagName === 'vue-block') {
        const componentName = el.getAttribute('data-component') || ''
        const Component = mergedComponentMap[componentName]

        if (!Component) {
          // 未注册的组件 → 优雅降级为普通 HTML 渲染
          console.warn(`[MarkdownRenderer] Unknown component: ${componentName}, fallback to HTML`)
          const children = Array.from(el.childNodes).map(domNodeToVNode).filter(Boolean)
          return h('div', { class: 'markdown-block-fallback' }, children as VNode[])
        }

        // 提取 data-* 属性为 props
        const rawProps: Record<string, string> = {}
        for (const attr of Array.from(el.attributes)) {
          if (attr.name.startsWith('data-') && attr.name !== 'data-component') {
            const propName = attr.name
              .replace('data-', '')
              .replace(/-([a-z])/g, (_, c) => c.toUpperCase())  // kebab → camelCase
            rawProps[propName] = attr.value
          }
        }

        // Props 校验 + 清洗
        const validatedProps = props.enableValidation
          ? validateProps(componentName, rawProps, mergedSchemas)
          : rawProps

        // 生成块 ID
        const blockId = rawProps.id || `block-${++blockIdCounter}`

        // 子内容作为 default slot
        const children = Array.from(el.childNodes).map(domNodeToVNode).filter(Boolean)

        // 构建 VNode，注入 eventBus 引用和 blockId
        return h(Component, {
          ...validatedProps,
          blockId,
          eventBus,
          // 监听组件的 agent-action 事件（组件内部 emit）
          'onAgent-action': (event: string, data: Record<string, unknown>) => {
            eventBus.emit({
              blockId,
              event,
              componentType: componentName,
              data: sanitizePayload(data) as Record<string, unknown>,
            })
          },
        }, {
          default: () => children,
        })
      }

      // ========== 普通 HTML 元素 ==========
      const children = Array.from(el.childNodes).map(domNodeToVNode).filter(Boolean)
      const attrs: Record<string, string> = {}
      for (const attr of Array.from(el.attributes)) {
        attrs[attr.name] = attr.value
      }
      return h(tagName, attrs, children as VNode[])
    }

    // 监听 content 变化 → 重新解析
    watch(
      () => props.content,
      (newContent) => {
        const html = parse(newContent)
        const parser = new DOMParser()
        const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')
        const root = doc.body.firstChild!

        vnodes.value = Array.from(root.childNodes)
          .map(domNodeToVNode)
          .filter(Boolean) as VNode[]
      },
      { immediate: true }
    )

    // 清理
    onBeforeUnmount(() => {
      eventBus.destroy()
    })

    return () => h('div', { class: 'markdown-body' }, vnodes.value)
  },
})
```

### 3.4 useMarkdownParser 增强

**文件**: `src/composables/useMarkdownParser.ts`

新增容器块的 markdown-it-container 注册。

```typescript
// src/composables/useMarkdownParser.ts（新增注册部分）

import MarkdownIt from 'markdown-it'
import container from 'markdown-it-container'
import { autoCloseContainers } from '../core/autoCloseContainers'

/**
 * 支持的容器块类型及其解析规则
 */
const BLOCK_CONFIGS = [
  // --- 已有 ---
  {
    name: 'alert',
    validate: (params: string) => /^alert/.test(params.trim()),
    render: (tokens: any[], idx: number) => {
      const token = tokens[idx]
      if (token.nesting === 1) {
        const type = token.info.trim().replace('alert', '').trim() || 'info'
        return `<vue-block data-component="AlertBlock" data-type="${type}">\n`
      }
      return '</vue-block>\n'
    },
  },
  {
    name: 'card',
    validate: (params: string) => /^card/.test(params.trim()),
    render: (tokens: any[], idx: number) => {
      const token = tokens[idx]
      if (token.nesting === 1) {
        const title = token.info.trim().replace('card', '').trim()
        return `<vue-block data-component="DataCard" data-title="${title}">\n`
      }
      return '</vue-block>\n'
    },
  },

  // --- v2 新增 ---
  {
    name: 'confirm',
    validate: (params: string) => /^\s*confirm/.test(params.trim()),
    render: (tokens: any[], idx: number) => {
      const token = tokens[idx]
      if (token.nesting === 1) {
        const info = token.info.trim()
        const attrs = parseBlockAttributes(info.replace(/^confirm\s*/, ''))
        return `<vue-block data-component="ConfirmBlock" ${attrsToDataString(attrs)}>\n`
      }
      return '</vue-block>\n'
    },
  },
  {
    name: 'select',
    validate: (params: string) => /^\s*select/.test(params.trim()),
    render: (tokens: any[], idx: number) => {
      const token = tokens[idx]
      if (token.nesting === 1) {
        const info = token.info.trim()
        const attrs = parseBlockAttributes(info.replace(/^select\s*/, ''))
        return `<vue-block data-component="SelectBlock" ${attrsToDataString(attrs)}>\n`
      }
      return '</vue-block>\n'
    },
  },
  {
    name: 'form',
    validate: (params: string) => /^\s*form/.test(params.trim()),
    render: (tokens: any[], idx: number) => {
      const token = tokens[idx]
      if (token.nesting === 1) {
        const info = token.info.trim()
        const attrs = parseBlockAttributes(info.replace(/^form\s*/, ''))
        return `<vue-block data-component="FormBlock" ${attrsToDataString(attrs)}>\n`
      }
      return '</vue-block>\n'
    },
  },
  {
    name: 'progress',
    validate: (params: string) => /^\s*progress/.test(params.trim()),
    render: (tokens: any[], idx: number) => {
      const token = tokens[idx]
      if (token.nesting === 1) {
        const info = token.info.trim()
        const attrs = parseBlockAttributes(info.replace(/^progress\s*/, ''))
        return `<vue-block data-component="ProgressBlock" ${attrsToDataString(attrs)}>\n`
      }
      return '</vue-block>\n'
    },
  },
  {
    name: 'datatable',
    validate: (params: string) => /^\s*datatable/.test(params.trim()),
    render: (tokens: any[], idx: number) => {
      const token = tokens[idx]
      if (token.nesting === 1) {
        const info = token.info.trim()
        const attrs = parseBlockAttributes(info.replace(/^datatable\s*/, ''))
        return `<vue-block data-component="DataTableBlock" ${attrsToDataString(attrs)}>\n`
      }
      return '</vue-block>\n'
    },
  },
  {
    name: 'actions',
    validate: (params: string) => /^\s*actions/.test(params.trim()),
    render: (tokens: any[], idx: number) => {
      const token = tokens[idx]
      if (token.nesting === 1) {
        return `<vue-block data-component="ActionPills">\n`
      }
      return '</vue-block>\n'
    },
  },
]

/**
 * 解析块属性字符串
 * 输入: 'action="delete" level=warning id=my-confirm'
 * 输出: { action: 'delete', level: 'warning', id: 'my-confirm' }
 */
function parseBlockAttributes(attrStr: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  // 匹配 key=value 或 key="value with spaces"
  const regex = /(\w[\w-]*)=(?:"([^"]*)"|(\S+))/g
  let match
  while ((match = regex.exec(attrStr)) !== null) {
    attrs[match[1]] = match[2] ?? match[3]
  }
  // 匹配独立的布尔属性（无 = 号）
  const boolRegex = /(?:^|\s)(\w[\w-]*)(?=\s|$)/g
  const cleaned = attrStr.replace(regex, '')
  while ((match = boolRegex.exec(cleaned)) !== null) {
    attrs[match[1]] = 'true'
  }
  return attrs
}

/**
 * 将属性对象转为 data-* HTML 属性字符串
 */
function attrsToDataString(attrs: Record<string, string>): string {
  return Object.entries(attrs)
    .map(([key, value]) => {
      // camelCase → kebab-case for data attributes
      const kebab = key.replace(/([A-Z])/g, '-$1').toLowerCase()
      // HTML 属性值转义
      const escaped = value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      return `data-${kebab}="${escaped}"`
    })
    .join(' ')
}

/**
 * 创建 Markdown 解析器（增强版）
 */
export function useMarkdownParser() {
  const md = new MarkdownIt({ html: true, linkify: true, typographer: true })

  // 注册所有容器块
  for (const config of BLOCK_CONFIGS) {
    md.use(container, config.name, {
      validate: config.validate,
      render: config.render,
    })
  }

  function parse(content: string): string {
    const safeContent = autoCloseContainers(content)
    return md.render(safeContent)
  }

  return { parse, md }
}
```

---

## 四、内置 Agent UI 组件

### 4.1 ConfirmBlock — 确认操作

**Markdown 语法**:
```markdown
::: confirm action="delete_user" level=danger
确认要删除用户 **张三** 吗？此操作不可撤销。
:::
```

**文件**: `src/components/blocks/ConfirmBlock.vue`

```vue
<script setup lang="ts">
import { ref, inject } from 'vue'
import { AGENT_EVENT_BUS_KEY } from '../MarkdownRenderer'
import type { AgentEventBus } from '../../core/eventBus'

const props = withDefaults(defineProps<{
  action?: string
  level?: 'info' | 'warning' | 'danger'
  confirmText?: string
  cancelText?: string
  blockId?: string
  eventBus?: AgentEventBus
}>(), {
  action: '',
  level: 'warning',
  confirmText: '确认',
  cancelText: '取消',
})

const emit = defineEmits<{
  'agent-action': [event: string, data: Record<string, unknown>]
}>()

const submitted = ref(false)
const result = ref<'confirmed' | 'cancelled' | null>(null)

function handleConfirm() {
  if (submitted.value) return
  submitted.value = true
  result.value = 'confirmed'
  emit('agent-action', 'confirm', {
    action: props.action,
    confirmed: true,
  })
}

function handleCancel() {
  if (submitted.value) return
  submitted.value = true
  result.value = 'cancelled'
  emit('agent-action', 'cancel', {
    action: props.action,
    confirmed: false,
  })
}

const levelColors = {
  info: { border: '#4472C4', bg: '#E8F0FE' },
  warning: { border: '#E6A23C', bg: '#FDF6EC' },
  danger: { border: '#F56C6C', bg: '#FEF0F0' },
}
</script>

<template>
  <div
    class="confirm-block"
    :style="{
      borderLeft: `4px solid ${levelColors[level].border}`,
      background: levelColors[level].bg,
      padding: '16px',
      borderRadius: '8px',
      margin: '12px 0',
    }"
  >
    <div class="confirm-content">
      <slot />
    </div>
    <div
      v-if="!submitted"
      style="display: flex; gap: 12px; margin-top: 12px;"
    >
      <button
        class="confirm-btn confirm-btn--primary"
        :style="{
          background: levelColors[level].border,
          color: '#fff',
          border: 'none',
          padding: '8px 20px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
        }"
        @click="handleConfirm"
      >
        {{ confirmText }}
      </button>
      <button
        class="confirm-btn confirm-btn--secondary"
        :style="{
          background: 'transparent',
          color: '#666',
          border: '1px solid #ddd',
          padding: '8px 20px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
        }"
        @click="handleCancel"
      >
        {{ cancelText }}
      </button>
    </div>
    <div
      v-else
      style="margin-top: 12px; font-size: 14px; color: #666;"
    >
      {{ result === 'confirmed' ? '✓ 已确认' : '✗ 已取消' }}
    </div>
  </div>
</template>
```

### 4.2 SelectBlock — 选择/消歧

**Markdown 语法**:
```markdown
::: select mode=single columns=2
- **小米科技有限责任公司** | 91110108551385082Q
- **小米汽车科技有限公司** | 91110400MA7D6T4W01
- **广东小米科技有限责任公司** | 91440101MA59A5P606
:::
```

**文件**: `src/components/blocks/SelectBlock.vue`

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  mode?: 'single' | 'multiple'
  columns?: number
  maxSelect?: number
  blockId?: string
}>(), {
  mode: 'single',
  columns: 2,
  maxSelect: 1,
})

const emit = defineEmits<{
  'agent-action': [event: string, data: Record<string, unknown>]
}>()

const selected = ref<Set<number>>(new Set())
const confirmed = ref(false)

/**
 * 从 slot 内容中解析选项
 * 支持格式: "- **标题** | 副标题"  或  "- 标题"
 */
const slotEl = ref<HTMLElement | null>(null)

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
  })
}
</script>

<template>
  <div class="select-block" style="margin: 12px 0;">
    <!-- Slot 内容用于解析选项列表 -->
    <div
      ref="slotEl"
      :style="{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '10px',
      }"
    >
      <slot />
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
```

### 4.3 FormBlock — 动态表单

**Markdown 语法**:
```markdown
::: form id="feedback" submitText="提交反馈"
- rating: select ["很满意", "一般", "不满意"]
- comment: textarea "请输入反馈..."
- urgent: checkbox "紧急问题"
:::
```

**文件**: `src/components/blocks/FormBlock.vue`

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = withDefaults(defineProps<{
  id?: string
  submitText?: string
  layout?: 'vertical' | 'horizontal'
  blockId?: string
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
const formData = ref<Record<string, unknown>>({})
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

    const [, name, type, rest] = match
    const field: FormField = { name, type: type as FormField['type'], placeholder: '' }

    if (type === 'select') {
      // 解析 ["opt1", "opt2"]
      const optMatch = rest.match(/\[([^\]]+)\]/)
      if (optMatch) {
        field.options = optMatch[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''))
      }
    } else if (type === 'checkbox') {
      field.placeholder = rest.replace(/^["']|["']$/g, '').trim()
      formData.value[name] = false
    } else {
      field.placeholder = rest.replace(/^["']|["']$/g, '').trim()
      formData.value[name] = ''
    }

    parsed.push(field)
  })

  fields.value = parsed
}

const slotContainer = ref<HTMLElement | null>(null)

onMounted(() => {
  if (slotContainer.value) {
    parseFieldsFromSlot(slotContainer.value)
  }
})

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
```

### 4.4 ProgressBlock — 进度展示

**Markdown 语法**:
```markdown
::: progress value=73 max=100 status=active
正在导入数据... 已处理 73/100 条
:::
```

**文件**: `src/components/blocks/ProgressBlock.vue`

```vue
<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  value?: number
  max?: number
  label?: string
  status?: 'active' | 'success' | 'error'
  blockId?: string
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
```

### 4.5 ActionPills — 快捷操作气泡

**Markdown 语法**:
```markdown
::: actions
- 处理进度如何
- 报告生成多久
- 可以下载了吗
:::
```

**文件**: `src/components/blocks/ActionPills.vue`

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
  layout?: 'inline' | 'wrap'
  blockId?: string
}>()

const emit = defineEmits<{
  'agent-action': [event: string, data: Record<string, unknown>]
}>()

const pills = ref<string[]>([])
const clickedIndex = ref<number | null>(null)
const slotContainer = ref<HTMLElement | null>(null)

onMounted(() => {
  if (slotContainer.value) {
    const items = slotContainer.value.querySelectorAll('li')
    pills.value = Array.from(items).map((li) => li.textContent?.trim() || '')
  }
})

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
        <span style="font-size: 14px;">💡</span>
        {{ pill }}
      </button>
    </div>
  </div>
</template>
```

### 4.6 DataTableBlock — 数据表格（从 slot HTML 解析）

**Markdown 语法**:
```markdown
::: datatable sortable filterable
| 姓名 | 部门 | 状态 |
|------|------|------|
| 张三 | 研发 | 在线 |
| 李四 | 产品 | 离线 |
:::
```

**文件**: `src/components/blocks/DataTableBlock.vue`

```vue
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

const props = withDefaults(defineProps<{
  sortable?: boolean
  filterable?: boolean
  pageSize?: number
  blockId?: string
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

onMounted(() => {
  if (slotContainer.value) {
    const table = slotContainer.value.querySelector('table')
    if (!table) return
    const ths = table.querySelectorAll('th')
    headers.value = Array.from(ths).map((th) => th.textContent?.trim() || '')
    const trs = table.querySelectorAll('tbody tr')
    rows.value = Array.from(trs).map((tr) =>
      Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.trim() || '')
    )
  }
})

const filteredRows = computed(() => {
  let result = [...rows.value]
  if (props.filterable && filterText.value) {
    const q = filterText.value.toLowerCase()
    result = result.filter((row) => row.some((cell) => cell.toLowerCase().includes(q)))
  }
  if (props.sortable && sortColumn.value !== null) {
    const col = sortColumn.value
    const dir = sortDir.value === 'asc' ? 1 : -1
    result.sort((a, b) => a[col].localeCompare(b[col]) * dir)
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
            v-for="(h, i) in headers"
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
            {{ h }}
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
```

---

## 五、Composable：useAgentEvents

**文件**: `src/composables/useAgentEvents.ts`

为宿主应用提供便捷的事件管理 hook。

```typescript
// src/composables/useAgentEvents.ts

import { ref, type Ref } from 'vue'
import type { AgentActionPayload } from '../core/eventBus'

/**
 * 便捷的 Agent 事件管理 Composable
 *
 * 使用方式:
 * ```vue
 * <script setup>
 * const { handleAction, lastAction, actionHistory } = useAgentEvents()
 *
 * async function handleAction(payload) {
 *   // 将用户操作发送给 Agent
 *   await sendToAgent(payload)
 * }
 * </script>
 *
 * <template>
 *   <MarkdownRenderer :content="text" @agent:action="handleAction" />
 * </template>
 * ```
 */
export function useAgentEvents() {
  const lastAction: Ref<AgentActionPayload | null> = ref(null)
  const actionHistory: Ref<AgentActionPayload[]> = ref([])
  const isProcessing = ref(false)

  /**
   * 处理 Agent 事件的通用 handler
   *
   * @param handler - 自定义处理逻辑（通常是发送给 Agent API）
   * @returns 绑定到 @agent:action 的事件处理函数
   */
  function createHandler(
    handler: (payload: AgentActionPayload) => void | Promise<void>,
  ) {
    return async (payload: AgentActionPayload) => {
      lastAction.value = payload
      actionHistory.value.push(payload)
      isProcessing.value = true

      try {
        await handler(payload)
      } finally {
        isProcessing.value = false
      }
    }
  }

  /**
   * 将 AgentActionPayload 序列化为可发送给 Agent 的文本消息
   *
   * 常见格式:
   * "[用户操作] 在 ConfirmBlock 中点击了确认，action=delete_user, confirmed=true"
   */
  function serializeToMessage(payload: AgentActionPayload): string {
    const parts = [`[用户操作] ${payload.componentType}`]

    switch (payload.event) {
      case 'confirm':
        parts.push(`确认了操作: ${payload.data.action || ''}`)
        break
      case 'cancel':
        parts.push(`取消了操作: ${payload.data.action || ''}`)
        break
      case 'submit':
        parts.push(`提交了表单: ${JSON.stringify(payload.data.values || {})}`)
        break
      case 'select':
        parts.push(`选择了: ${JSON.stringify(payload.data.selectedIndices || [])}`)
        break
      case 'pill_click':
        parts.push(`点击了快捷操作: "${payload.data.text || ''}"`)
        break
      default:
        parts.push(`${payload.event}: ${JSON.stringify(payload.data)}`)
    }

    return parts.join(' — ')
  }

  return {
    lastAction,
    actionHistory,
    isProcessing,
    createHandler,
    serializeToMessage,
  }
}
```

---

## 六、类型定义

**文件**: `src/types/index.ts`

```typescript
import type { Component } from 'vue'
import type { AgentEventBus } from '../core/eventBus'

/**
 * 组件注册表类型
 */
export type ComponentMap = Record<string, Component>

/**
 * 块组件 Props 基础接口
 * 所有内置块组件都继承此接口
 */
export interface BlockBaseProps {
  /** 块实例唯一 ID（自动生成或 data-id 指定） */
  blockId?: string
  /** 事件总线引用（由 MarkdownRenderer 注入） */
  eventBus?: AgentEventBus
}
```

**文件**: `src/types/protocol.ts`

```typescript
/**
 * Agent UI Protocol 版本
 */
export const PROTOCOL_VERSION = '2.0.0'

/**
 * 支持的容器块类型
 */
export const SUPPORTED_BLOCKS = [
  'alert', 'card',              // v1 已有
  'confirm', 'select', 'form',  // v2 交互组件
  'progress', 'datatable',      // v2 展示组件
  'actions',                    // v2 快捷操作
] as const

export type SupportedBlock = typeof SUPPORTED_BLOCKS[number]
```

---

## 七、统一导出

**文件**: `src/index.ts`

```typescript
// ======== 核心组件 ========
export { default as MarkdownRenderer } from './components/MarkdownRenderer'

// ======== 内置块组件（支持 tree-shaking 单独引入） ========
export { default as AlertBlock } from './components/blocks/AlertBlock.vue'
export { default as DataCard } from './components/blocks/DataCard.vue'
export { default as ConfirmBlock } from './components/blocks/ConfirmBlock.vue'
export { default as SelectBlock } from './components/blocks/SelectBlock.vue'
export { default as FormBlock } from './components/blocks/FormBlock.vue'
export { default as ProgressBlock } from './components/blocks/ProgressBlock.vue'
export { default as DataTableBlock } from './components/blocks/DataTableBlock.vue'
export { default as ActionPills } from './components/blocks/ActionPills.vue'

// ======== Composables ========
export { useStreamingText } from './composables/useStreamingText'
export { useMarkdownParser } from './composables/useMarkdownParser'
export { useAgentEvents } from './composables/useAgentEvents'

// ======== Core ========
export { createAgentEventBus } from './core/eventBus'
export { validateProps, sanitizePayload, defaultSchemas } from './core/propValidator'
export { autoCloseContainers } from './core/autoCloseContainers'

// ======== Types ========
export type { AgentActionPayload, AgentEventBus, AgentActionHandler } from './core/eventBus'
export type { ComponentPropsSchema, PropRule } from './core/propValidator'
export type { ComponentMap, BlockBaseProps } from './types'
export { PROTOCOL_VERSION, SUPPORTED_BLOCKS } from './types/protocol'
```

---

## 八、使用示例

### 8.1 基础用法（v1 兼容，零改动）

```vue
<script setup>
import { MarkdownRenderer, useStreamingText } from '@krishanjinbo/vue-markdown-stream'

const { text, isStreaming, startStream } = useStreamingText()
</script>

<template>
  <MarkdownRenderer :content="text" />
</template>
```

### 8.2 Agent 交互用法（v2 新增）

```vue
<script setup>
import { ref } from 'vue'
import { MarkdownRenderer, useAgentEvents } from '@krishanjinbo/vue-markdown-stream'

const content = ref('')
const isStreaming = ref(false)
const { createHandler, serializeToMessage } = useAgentEvents()

// 对接 Dify 对话 API
const DIFY_API = '/api/v1/chat-messages'
const conversationId = ref('')

const handleAction = createHandler(async (payload) => {
  // 1. 将用户操作序列化为文本消息
  const message = serializeToMessage(payload)

  // 2. 发送给 Dify Agent
  const response = await fetch(DIFY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_KEY',
    },
    body: JSON.stringify({
      inputs: {},
      query: message,
      response_mode: 'streaming',
      conversation_id: conversationId.value,
      user: 'user-123',
    }),
  })

  // 3. 流式读取 Agent 响应并追加到 content
  isStreaming.value = true
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    // 解析 Dify SSE 格式
    const lines = chunk.split('\n').filter((l) => l.startsWith('data:'))
    for (const line of lines) {
      try {
        const data = JSON.parse(line.slice(5))
        if (data.event === 'message') {
          content.value += data.answer
        }
        if (data.conversation_id) {
          conversationId.value = data.conversation_id
        }
      } catch {}
    }
  }

  isStreaming.value = false
})

// 初始提问
async function startChat(prompt: string) {
  content.value = ''
  // ... 同上流式请求逻辑
}
</script>

<template>
  <div class="chat-container">
    <MarkdownRenderer
      :content="content"
      @agent:action="handleAction"
    />
  </div>
</template>
```

### 8.3 自定义组件扩展

```vue
<script setup>
import { MarkdownRenderer } from '@krishanjinbo/vue-markdown-stream'
import MyChartBlock from './components/MyChartBlock.vue'

// 注册自定义组件（会与内置组件合并）
const customComponents = {
  ChartBlock: MyChartBlock,
}

// 自定义 Props Schema
const customSchemas = {
  ChartBlock: {
    allowed: {
      type: { type: 'enum', enum: ['bar', 'line', 'pie'], default: 'bar' },
      title: { type: 'string', maxLength: 50 },
    },
  },
}
</script>

<template>
  <MarkdownRenderer
    :content="text"
    :components="customComponents"
    :props-schemas="customSchemas"
    @agent:action="handleAction"
  />
</template>
```

---

## 九、autoCloseContainers 增强

v2 需要支持更多容器块类型的自动补全：

```typescript
// src/core/autoCloseContainers.ts

const CONTAINER_PATTERN = /^:::\s*(\w+)/

/**
 * 自动补全未闭合的 ::: 容器块
 *
 * 增强点（v2）:
 * - 支持嵌套容器块的正确补全
 * - 支持 ::: 后带属性参数的容器
 */
export function autoCloseContainers(content: string): string {
  const lines = content.split('\n')
  const openStack: string[] = []  // 记录打开的容器类型

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed === ':::') {
      // 关闭最近一个打开的容器
      if (openStack.length > 0) {
        openStack.pop()
      }
    } else if (CONTAINER_PATTERN.test(trimmed)) {
      // 打开一个新容器
      openStack.push(trimmed)
    }
  }

  // 补全所有未关闭的容器（从内到外）
  if (openStack.length > 0) {
    const closings = openStack.map(() => ':::').join('\n')
    return content + '\n' + closings
  }

  return content
}
```

---

## 十、构建配置调整

**文件**: `vite.config.ts` 库构建配置:

```typescript
// vite.config.ts（lib 模式）

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'VueMarkdownStream',
      formats: ['es', 'cjs'],
      fileName: (format) => `vue-markdown-stream.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['vue', 'markdown-it', 'markdown-it-container'],
      output: {
        globals: {
          vue: 'Vue',
          'markdown-it': 'MarkdownIt',
          'markdown-it-container': 'MarkdownItContainer',
        },
      },
    },
  },
})
```

---

## 十一、实施节奏

### Phase 1（Week 1-2）：核心基础设施
- [ ] 创建 `src/core/eventBus.ts`
- [ ] 创建 `src/core/propValidator.ts`
- [ ] 增强 `MarkdownRenderer.ts`（注入 eventBus、Props 校验、@agent:action）
- [ ] 创建 `src/composables/useAgentEvents.ts`
- [ ] 确保 v1 所有用法零改动可用（向后兼容测试）

### Phase 2（Week 2-3）：内置交互组件
- [ ] 实现 `ConfirmBlock.vue`
- [ ] 实现 `SelectBlock.vue`
- [ ] 实现 `ActionPills.vue`
- [ ] 增强 `useMarkdownParser.ts`（注册新容器块）
- [ ] 增强 `autoCloseContainers.ts`（支持新容器块）

### Phase 3（Week 3-4）：表单 + 数据组件
- [ ] 实现 `FormBlock.vue`
- [ ] 实现 `ProgressBlock.vue`
- [ ] 实现 `DataTableBlock.vue`

### Phase 4（Week 4-5）：文档 + 测试 + 发布
- [ ] 更新 VitePress 文档站
- [ ] 编写组件单元测试
- [ ] 编写集成测试（Dify 对接 demo）
- [ ] 更新 README + CHANGELOG
- [ ] npm 发布 v2.0.0

---

## 十二、Prompt 输出规范（给 Agent 的 System Prompt 参考）

在 Dify 工作流的 LLM 节点中，system prompt 应包含以下输出规范：

```
## 交互组件输出规范

当需要用户做出选择或确认时，使用以下 Markdown 容器语法输出交互组件：

### 确认操作
当需要用户确认一个操作时：
\`\`\`
::: confirm action="操作名称" level=warning
需要确认的说明文本（支持 **Markdown** 格式）
:::
\`\`\`
level 可选值：info / warning / danger

### 选择列表
当需要用户从多个选项中选择时：
\`\`\`
::: select mode=single columns=2
- **选项标题1** | 选项描述1
- **选项标题2** | 选项描述2
:::
\`\`\`
mode 可选值：single / multiple
columns 可选值：1 / 2 / 3 / 4

### 表单收集
当需要收集用户输入时：
\`\`\`
::: form id="表单ID" submitText="提交"
- fieldName: text "占位提示"
- fieldName: textarea "占位提示"
- fieldName: select ["选项1", "选项2"]
- fieldName: checkbox "标签文字"
:::
\`\`\`

### 进度展示
当需要展示任务进度时：
\`\`\`
::: progress value=73 max=100 status=active
进度说明文字
:::
\`\`\`
status 可选值：active / success / error

### 快捷操作
当需要给用户提供快捷引导时：
\`\`\`
::: actions
- 快捷操作文本1
- 快捷操作文本2
- 快捷操作文本3
:::
\`\`\`

### 注意事项
- ::: 和类型名之间只能有一个空格
- 属性值包含空格时用引号包裹
- 每个 ::: 块必须有对应的 ::: 结束标记
- 组件内容支持标准 Markdown 语法
```