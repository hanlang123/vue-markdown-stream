import {
  defineComponent, h, watch, shallowRef, provide, onBeforeUnmount,
  type PropType, type VNode
} from 'vue'
import { useMarkdownParser } from '../composables/useMarkdownParser'
import { createAgentEventBus, type AgentEventBus, type AgentActionPayload } from '../core/eventBus'
import { validateProps, sanitizePayload, type ComponentPropsSchema, defaultSchemas } from '../core/propValidator'
import { builtinComponentMap } from './blocks'
import type { ComponentMap } from '../types'

// Provide/Inject key
export const AGENT_EVENT_BUS_KEY = Symbol('agentEventBus')

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
    'agent:action': (_payload: AgentActionPayload) => true,
  },

  setup(props, { emit }) {
    // 合并组件注册表
    const mergedComponentMap: ComponentMap = {
      ...builtinComponentMap,
      ...props.components,
    }

    // 合并 Props Schema
    const mergedSchemas: Record<string, ComponentPropsSchema> = {
      ...defaultSchemas,
      ...props.propsSchemas,
    }

    // 创建事件总线
    const eventBus: AgentEventBus = createAgentEventBus()

    // 事件总线 → emit 到宿主
    eventBus.on((payload) => {
      emit('agent:action', payload)
    })

    // 通过 provide 注入给所有子组件
    provide(AGENT_EVENT_BUS_KEY, eventBus)

    // Markdown 解析器
    const { parse } = useMarkdownParser()
    const vnodes = shallowRef<VNode[]>([])

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

      // 非元素节点忽略
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
        blockIdCounter = 0  // 每次内容更新重置计数器
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
