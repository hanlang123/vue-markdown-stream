import { defineComponent, h, type PropType } from 'vue'
import MarkdownRenderer from '../components/MarkdownRenderer'
import { useMarkdownParser } from './useMarkdownParser'
import type { BlockDefinition } from '../core/blockRegistry'
import type { ComponentPropsSchema } from '../core/propValidator'
import type { ComponentMap } from '../types'

export interface CreateMarkdownStreamOptions {
  /** 预注册的块集合（用 `defineBlock` 创建） */
  blocks?: BlockDefinition[]
  /** 额外组件（非 defineBlock 机制，直接 componentMap 合并） */
  components?: ComponentMap
  /** 额外的 propsSchemas */
  propsSchemas?: Record<string, ComponentPropsSchema>
  /** 是否启用 Props 安全校验 */
  enableValidation?: boolean
}

/**
 * 工厂式用法：一次配置，全应用复用
 *
 * @example
 * ```ts
 * // app/markdown.ts
 * import { createMarkdownStream, defineBlock } from '@krishanjinbo/vue-markdown-stream'
 * import JobCard from './JobCard.vue'
 *
 * export const { MarkdownRenderer, parse, registry } = createMarkdownStream({
 *   blocks: [defineBlock({ name: 'job-card', component: JobCard, parseInfo: 'json' })],
 * })
 *
 * // 任意页面
 * <MarkdownRenderer :content="text" streaming />
 * ```
 */
export function createMarkdownStream(options: CreateMarkdownStreamOptions = {}) {
  const { parse, md, registry } = useMarkdownParser({ blocks: options.blocks })

  const PreconfiguredRenderer = defineComponent({
    name: 'PreconfiguredMarkdownRenderer',
    props: {
      content: { type: String, required: true },
      streaming: { type: Boolean, default: false },
      cursor: { type: String, default: '▍' },
      /** 页面级额外块（会覆盖全局同名） */
      blocks: {
        type: Array as PropType<BlockDefinition[]>,
        default: () => [],
      },
      /** 页面级额外组件 */
      components: {
        type: Object as PropType<ComponentMap>,
        default: () => ({}),
      },
      /** 页面级额外 schemas */
      propsSchemas: {
        type: Object as PropType<Record<string, ComponentPropsSchema>>,
        default: () => ({}),
      },
      enableValidation: { type: Boolean, default: options.enableValidation !== false },
    },
    emits: ['agent:action'],
    setup(pprops, { emit }) {
      return () =>
        h(MarkdownRenderer, {
          content: pprops.content,
          streaming: pprops.streaming,
          cursor: pprops.cursor,
          enableValidation: pprops.enableValidation,
          // 合并工厂级 & 页面级 blocks
          blocks: [...(options.blocks || []), ...pprops.blocks],
          components: { ...(options.components || {}), ...pprops.components },
          propsSchemas: { ...(options.propsSchemas || {}), ...pprops.propsSchemas },
          'onAgent:action': (payload: unknown) => emit('agent:action', payload),
        })
    },
  })

  return {
    /** 预配置好的 MarkdownRenderer 组件 */
    MarkdownRenderer: PreconfiguredRenderer,
    /** 复用的 parse() */
    parse,
    /** 底层 MarkdownIt 实例 */
    md,
    /** 块注册中心 */
    registry,
  }
}
