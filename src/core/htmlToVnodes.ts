import { h, type VNode } from 'vue'
import type { ComponentMap } from '../types'
import type { AgentEventBus } from './eventBus'
import {
  validateProps,
  sanitizePayload,
  type ComponentPropsSchema,
} from './propValidator'

/**
 * htmlToVnodes 的配置
 */
export interface HtmlToVnodesOptions {
  /** 组件注册表：data-component → Vue 组件 */
  componentMap: ComponentMap
  /** Props 安全校验 Schema */
  schemas?: Record<string, ComponentPropsSchema>
  /** 事件总线（可选） */
  eventBus?: AgentEventBus
  /** 是否启用 Props 校验（默认 true） */
  enableValidation?: boolean
  /**
   * 稳定 key 策略
   * true: 使用 data-id > data-props hash > {component}:{index}
   * false: 完全不生成 key（由 Vue 自行 diff）
   * 默认 true
   */
  stableKey?: boolean
  /**
   * JSON props 缓存：相同原文 → 相同对象引用
   * 调用方可传入自己的 Map 以跨次调用保持引用稳定（例如 streaming 场景）
   */
  propsCache?: Map<string, Record<string, unknown>>
}

const DEFAULT_PROPS_CACHE = new Map<string, Record<string, unknown>>()

/**
 * 从 `data-props` 属性中还原 JSON 对象，复用缓存保证引用稳定
 */
export function resolveJsonProps(
  encoded: string,
  cache: Map<string, Record<string, unknown>> = DEFAULT_PROPS_CACHE,
): Record<string, unknown> | null {
  if (!encoded) return null
  const cached = cache.get(encoded)
  if (cached) return cached
  try {
    const decoded = decodeURIComponent(encoded)
    const parsed = JSON.parse(decoded)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      cache.set(encoded, parsed as Record<string, unknown>)
      return parsed as Record<string, unknown>
    }
  } catch {
    /* stream 中途 JSON 可能不完整 → 忽略 */
  }
  return null
}

/**
 * 内部：将单个 DOM 节点递归转换为 VNode
 */
function nodeToVNode(
  node: Node,
  opts: Required<Pick<HtmlToVnodesOptions, 'componentMap' | 'stableKey' | 'enableValidation'>> & {
    schemas: Record<string, ComponentPropsSchema>
    eventBus?: AgentEventBus
    propsCache: Map<string, Record<string, unknown>>
    counter: { n: number }
  },
): VNode | string | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || null
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null

  const el = node as HTMLElement
  const tag = el.tagName.toLowerCase()

  if (tag === 'vue-block') {
    return vueBlockToVNode(el, opts)
  }

  // 普通元素
  const children = Array.from(el.childNodes)
    .map((c) => nodeToVNode(c, opts))
    .filter((x) => x !== null) as (VNode | string)[]
  const attrs: Record<string, string> = {}
  for (const attr of Array.from(el.attributes)) {
    if (!isSafePlainAttr(attr.name, attr.value)) continue
    attrs[attr.name] = attr.value
  }
  return h(tag, attrs, children as VNode[])
}

/**
 * 非 vue-block 的普通 HTML 元素的属性白名单过滤
 *
 * markdown-it 默认会 HTML 转义；即便用户配置了 `html: true`，
 * 这里依然过滤 on* 内联事件与 javascript: 协议，作为渲染层的防御兜底。
 */
function isSafePlainAttr(name: string, value: string): boolean {
  const lower = name.toLowerCase()
  if (lower.startsWith('on')) return false
  if (lower === 'style') return true // Vue 渲染时 style 是字符串，仍由 Vue 处理
  if (lower === 'href' || lower === 'src' || lower === 'xlink:href' || lower === 'formaction') {
    const trimmed = value.trim().toLowerCase()
    if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:text/html')) {
      return false
    }
  }
  return true
}

function vueBlockToVNode(
  el: HTMLElement,
  opts: Required<Pick<HtmlToVnodesOptions, 'componentMap' | 'stableKey' | 'enableValidation'>> & {
    schemas: Record<string, ComponentPropsSchema>
    eventBus?: AgentEventBus
    propsCache: Map<string, Record<string, unknown>>
    counter: { n: number }
  },
): VNode {
  const componentName = el.getAttribute('data-component') || ''
  const Component = opts.componentMap[componentName]

  if (!Component) {
    console.warn(`[htmlToVnodes] Unknown component: ${componentName}, fallback to HTML`)
    const children = Array.from(el.childNodes)
      .map((c) => nodeToVNode(c, opts))
      .filter((x) => x !== null) as (VNode | string)[]
    return h('div', { class: 'markdown-block-fallback' }, children as VNode[])
  }

  // 1. 收集 data-* 属性（剔除 data-component / data-props）
  const rawAttrs: Record<string, string> = {}
  const propsEncoded = el.getAttribute('data-props') || ''
  for (const attr of Array.from(el.attributes)) {
    if (!attr.name.startsWith('data-')) continue
    if (attr.name === 'data-component' || attr.name === 'data-props') continue
    const propName = attr.name.replace('data-', '').replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    rawAttrs[propName] = attr.value
  }

  // 2. Props 校验（只对 string 类型的 attrs 做 schema 校验）
  const validatedAttrs = opts.enableValidation
    ? validateProps(componentName, rawAttrs, opts.schemas)
    : (rawAttrs as Record<string, unknown>)

  // 3. JSON payload（data-props）合并，user JSON 优先级高于 attrs
  const jsonProps = propsEncoded ? resolveJsonProps(propsEncoded, opts.propsCache) : null
  const mergedProps: Record<string, unknown> = {
    ...validatedAttrs,
    ...(jsonProps || {}),
  }

  // 4. blockId / key 策略
  const explicitId = (rawAttrs['id'] as string | undefined) || ''
  const positionIdx = ++opts.counter.n
  const key = opts.stableKey
    ? explicitId
      ? `id:${explicitId}`
      : propsEncoded
        ? `${componentName}:props:${propsEncoded}`
        : `${componentName}:pos:${positionIdx}`
    : undefined
  const blockId = explicitId || `block-${positionIdx}`

  // 5. children
  const children = Array.from(el.childNodes)
    .map((c) => nodeToVNode(c, opts))
    .filter((x) => x !== null) as (VNode | string)[]

  // 6. 构建 VNode
  const vnodeProps: Record<string, unknown> = {
    ...mergedProps,
    blockId,
    eventBus: opts.eventBus,
    key,
  }
  if (opts.eventBus) {
    vnodeProps['onAgent-action'] = (event: string, data: Record<string, unknown>) => {
      opts.eventBus!.emit({
        blockId,
        event,
        componentType: componentName,
        data: sanitizePayload(data) as Record<string, unknown>,
      })
    }
  }

  return h(Component, vnodeProps, {
    default: () => children,
  })
}

/**
 * 将 HTML 字符串转换为 Vue VNode 数组
 *
 * 将 `<vue-block data-component="X">` 元素替换为已注册的 Vue 组件，
 * 其余元素原样保留为普通 HTML VNode。
 *
 * @example
 * ```ts
 * const html = md.render(':::alert info\nhi\n:::')
 * const vnodes = htmlToVnodes(html, { componentMap })
 * return () => h('div', vnodes)
 * ```
 */
export function htmlToVnodes(
  html: string,
  options: HtmlToVnodesOptions,
): VNode[] {
  if (!html) return []
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstChild as HTMLElement | null
  if (!root) return []

  const ctx = {
    componentMap: options.componentMap,
    schemas: options.schemas || {},
    eventBus: options.eventBus,
    enableValidation: options.enableValidation !== false,
    stableKey: options.stableKey !== false,
    propsCache: options.propsCache || DEFAULT_PROPS_CACHE,
    counter: { n: 0 },
  }

  return Array.from(root.childNodes)
    .map((n) => nodeToVNode(n, ctx))
    .filter((x) => x !== null) as VNode[]
}
