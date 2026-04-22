import {
  defineComponent,
  h,
  watch,
  shallowRef,
  provide,
  onBeforeUnmount,
  computed,
  type PropType,
  type VNode,
} from 'vue'
import { useMarkdownParser, type MarkdownParserOptions } from '../composables/useMarkdownParser'
import {
  createAgentEventBus,
  type AgentEventBus,
  type AgentActionPayload,
} from '../core/eventBus'
import {
  type ComponentPropsSchema,
  defaultSchemas,
} from '../core/propValidator'
import { builtinComponentMap } from './blocks'
import { htmlToVnodes } from '../core/htmlToVnodes'
import type { BlockDefinition } from '../core/blockRegistry'
import type { ComponentMap } from '../types'

/** Provide/Inject key —— 供深层子组件取 eventBus */
export const AGENT_EVENT_BUS_KEY = Symbol('agentEventBus')

export default defineComponent({
  name: 'MarkdownRenderer',

  props: {
    /** Markdown 内容（支持流式追加） */
    content: {
      type: String,
      required: true,
    },
    /** 自定义组件注册表（与内置组件合并，用户组件优先） */
    components: {
      type: Object as PropType<ComponentMap>,
      default: () => ({}),
    },
    /** 自定义 Props Schema（与默认 Schema 合并） */
    propsSchemas: {
      type: Object as PropType<Record<string, ComponentPropsSchema>>,
      default: () => ({}),
    },
    /** 是否启用 Props 安全校验（默认启用） */
    enableValidation: {
      type: Boolean,
      default: true,
    },
    /**
     * [v3] 额外注册的块（defineBlock 返回值）
     * 会一并装入内部 parser 与 componentMap
     */
    blocks: {
      type: Array as PropType<BlockDefinition[]>,
      default: () => [],
    },
    /**
     * [v3] 是否正在流式输出
     * true 时会：① 在内容末尾追加 `cursor` 字符；② 使用 rAF 节流解析，避免每个 chunk 重解析
     */
    streaming: {
      type: Boolean,
      default: false,
    },
    /** [v3] 流式光标字符（默认 `▍`），可传空字符串禁用 */
    cursor: {
      type: String,
      default: '▍',
    },
  },

  emits: {
    /**
     * Agent 操作事件
     * 所有内置/自定义块组件的用户交互都会通过此事件透传给宿主
     */
    'agent:action': (_payload: AgentActionPayload) => true,
  },

  setup(props, { emit }) {
    // --- Parser ---
    const parserOpts: MarkdownParserOptions = {
      blocks: props.blocks,
    }
    const { parse, registry } = useMarkdownParser(parserOpts)

    // --- Component map：内置 + registry 中的块组件 + 用户 props.components（最高优先级）---
    const registryComponentMap: ComponentMap = {}
    for (const def of registry.all()) {
      const name = def.componentName || def.name
      registryComponentMap[name] = def.component
    }
    const mergedComponentMap: ComponentMap = {
      ...builtinComponentMap,
      ...registryComponentMap,
      ...props.components,
    }

    // --- Schema map：默认 + registry 中的 schemas + 用户 propsSchemas（最高优先级）---
    const registrySchemas: Record<string, ComponentPropsSchema> = {}
    for (const def of registry.all()) {
      if (def.schema) {
        const name = def.componentName || def.name
        registrySchemas[name] = def.schema
      }
    }
    const mergedSchemas: Record<string, ComponentPropsSchema> = {
      ...defaultSchemas,
      ...registrySchemas,
      ...props.propsSchemas,
    }

    // --- Event Bus ---
    const eventBus: AgentEventBus = createAgentEventBus()
    eventBus.on((payload) => emit('agent:action', payload))
    provide(AGENT_EVENT_BUS_KEY, eventBus)

    // --- Props cache（跨次解析共享，保证引用稳定）---
    const propsCache = new Map<string, Record<string, unknown>>()

    // --- 渲染状态 ---
    const vnodes = shallowRef<VNode[]>([])

    // 实际用来解析的内容（附加流式光标）
    const displayContent = computed(() => {
      if (props.streaming && props.cursor) {
        return props.content + props.cursor
      }
      return props.content
    })

    // rAF 节流解析
    let rafId: number | null = null
    function scheduleParse(content: string) {
      if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
        doParse(content)
        return
      }
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        rafId = null
        doParse(content)
      })
    }

    function doParse(content: string) {
      const html = parse(content)
      vnodes.value = htmlToVnodes(html, {
        componentMap: mergedComponentMap,
        schemas: mergedSchemas,
        eventBus,
        enableValidation: props.enableValidation,
        stableKey: true,
        propsCache,
      })
    }

    watch(
      displayContent,
      (newContent) => {
        if (props.streaming) scheduleParse(newContent)
        else doParse(newContent)
      },
      { immediate: true },
    )

    onBeforeUnmount(() => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      eventBus.destroy()
      propsCache.clear()
    })

    return () => h('div', { class: 'markdown-body' }, vnodes.value)
  },
})
