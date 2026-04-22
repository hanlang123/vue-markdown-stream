import type { Component } from 'vue'
import type { ComponentPropsSchema } from './propValidator'

/**
 * info-string 解析策略
 *
 * - `attrs`  : `:::confirm action=delete level=danger`   → `{ action, level }`
 * - `json`   : `:::job-card {"title":"..."}`             → `{ __props: { title } }` (自动进 data-props)
 * - `title`  : `:::card 技术栈对比`                       → `{ title: '技术栈对比' }`
 * - 函数     : `(rawInfo) => Record<string, any>`
 *             返回对象中若含 `__props`（对象），会被当作 JSON payload 注入 data-props；
 *             其他普通字段走 data-* kebab 属性。
 */
export type ParseInfoStrategy =
  | 'attrs'
  | 'json'
  | 'title'
  | ((rawInfo: string) => Record<string, unknown>)

/**
 * 单个块的定义
 */
export interface BlockDefinition {
  /** 块名（markdown-it-container 名称，也是 `:::<name>` 语法中的关键字） */
  name: string
  /** 对应渲染的 Vue 组件 */
  component: Component
  /**
   * 组件在 componentMap 中的注册名（data-component 的值）
   * 默认等于 `name` 经首字母大写 + Block 后缀，例如 `job-card` → `JobCardBlock`
   * 也可显式指定，保持和既有组件名一致
   */
  componentName?: string
  /** info-string 解析策略，默认 `attrs` */
  parseInfo?: ParseInfoStrategy
  /** Props 安全校验 Schema（可选） */
  schema?: ComponentPropsSchema
  /**
   * 是否覆盖同名块（默认 false）
   * 内部重注册保护：防止用户意外覆盖内置块
   */
  override?: boolean
  /** 用于 LLM prompt 文档生成的元信息（可选） */
  docs?: {
    description?: string
    example?: string
    fields?: Array<{ name: string; type: string; description?: string; enum?: readonly string[] }>
  }
}

/**
 * 用户侧便捷工厂
 *
 * ```ts
 * const JobCard = defineBlock({
 *   name: 'job-card',
 *   component: JobCardBlock,
 *   parseInfo: 'json',
 * })
 * ```
 */
export function defineBlock(def: BlockDefinition): BlockDefinition {
  return def
}

/**
 * 将 `job-card` / `job_card` 转为 `JobCardBlock`（默认组件名）
 */
export function defaultComponentName(blockName: string): string {
  const pascal = blockName
    .split(/[-_\s]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  return /Block$/.test(pascal) ? pascal : `${pascal}Block`
}

/**
 * 解析 `key=value` / `key="value"` / `booleanFlag` 形式的属性串
 * （与原 useMarkdownParser 中的 parseBlockAttributes 等价）
 */
export function parseAttrString(attrStr: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const kvRegex = /(\w[\w-]*)=(?:"([^"]*)"|(\S+))/g
  let match: RegExpExecArray | null
  while ((match = kvRegex.exec(attrStr)) !== null) {
    attrs[match[1]!] = match[2] ?? match[3] ?? ''
  }
  // 布尔 flag
  const boolRegex = /(?:^|\s)(\w[\w-]*)(?=\s|$)/g
  const cleaned = attrStr.replace(kvRegex, '')
  while ((match = boolRegex.exec(cleaned)) !== null) {
    attrs[match[1]!] = 'true'
  }
  return attrs
}

/**
 * 特殊字段名：表示该字段的值是一个"对象型 props payload"
 * 最终会被序列化 + encodeURIComponent 放进 `data-props` 属性
 */
export const JSON_PAYLOAD_KEY = '__props'

/**
 * 将解析后的属性对象转为 markdown-it 可用的 HTML 属性字符串
 * - 对象型 __props → data-props="<encoded json>"
 * - 普通字段     → data-<kebab>="<escaped>"
 */
export function attrsToDataHtml(attrs: Record<string, unknown>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(attrs)) {
    if (key === JSON_PAYLOAD_KEY) {
      if (value && typeof value === 'object') {
        try {
          const encoded = encodeURIComponent(JSON.stringify(value))
          parts.push(`data-props="${encoded}"`)
        } catch {
          /* ignore */
        }
      }
      continue
    }
    const kebab = key.replace(/([A-Z])/g, '-$1').toLowerCase()
    const str = value == null ? '' : String(value)
    const escaped = str
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    parts.push(`data-${kebab}="${escaped}"`)
  }
  return parts.join(' ')
}

/**
 * 应用 parseInfo 策略，将 `:::name <rest>` 中的 rest 解析为属性对象
 */
export function applyParseInfo(
  strategy: ParseInfoStrategy | undefined,
  rawInfoAfterName: string,
): Record<string, unknown> {
  const rest = rawInfoAfterName.trim()
  const how = strategy ?? 'attrs'

  if (typeof how === 'function') {
    try {
      return how(rest) || {}
    } catch (err) {
      console.warn('[defineBlock] parseInfo function threw:', err)
      return {}
    }
  }

  switch (how) {
    case 'json': {
      if (!rest) return {}
      try {
        const parsed = JSON.parse(rest)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return { [JSON_PAYLOAD_KEY]: parsed }
        }
      } catch {
        // 流式过程中 JSON 可能不完整 → 静默忽略
      }
      return {}
    }
    case 'title':
      return rest ? { title: rest } : {}
    case 'attrs':
    default:
      return parseAttrString(rest)
  }
}

/**
 * 创建一个块注册中心
 *
 * 用于 `useMarkdownParser` / `MarkdownRenderer` / `createMarkdownStream` 共享状态
 */
export function createBlockRegistry() {
  const blocks = new Map<string, BlockDefinition>()

  function register(def: BlockDefinition) {
    if (blocks.has(def.name) && !def.override) {
      console.warn(
        `[blockRegistry] Block "${def.name}" already registered. Pass { override: true } to replace.`,
      )
      return
    }
    blocks.set(def.name, def)
  }

  function registerMany(defs: BlockDefinition[]) {
    for (const d of defs) register(d)
  }

  function get(name: string): BlockDefinition | undefined {
    return blocks.get(name)
  }

  function all(): BlockDefinition[] {
    return Array.from(blocks.values())
  }

  function has(name: string): boolean {
    return blocks.has(name)
  }

  function remove(name: string): boolean {
    return blocks.delete(name)
  }

  return { register, registerMany, get, all, has, remove }
}

export type BlockRegistry = ReturnType<typeof createBlockRegistry>
