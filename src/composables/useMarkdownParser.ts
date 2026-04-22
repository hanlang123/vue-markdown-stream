import MarkdownIt from 'markdown-it'
import container from 'markdown-it-container'
import { autoCloseContainers } from '../core/autoCloseContainers'
import {
  applyParseInfo,
  attrsToDataHtml,
  createBlockRegistry,
  defaultComponentName,
  type BlockDefinition,
  type BlockRegistry,
} from '../core/blockRegistry'
import { createBuiltinBlocks } from '../components/blocks'

export interface MarkdownParserOptions {
  /**
   * 额外注册的用户块（会与内置块合并；同名用户块若未 override 则会被忽略并警告）
   */
  blocks?: BlockDefinition[]
  /**
   * 是否包含内置块（默认 true）。设为 false 时仅使用 `blocks` 中的块
   */
  includeBuiltin?: boolean
  /** 预创建的 registry，优先使用 */
  registry?: BlockRegistry
  /** 传递给 MarkdownIt 的选项 */
  markdownItOptions?: ConstructorParameters<typeof MarkdownIt>[0]
}

/**
 * 用单个 BlockDefinition 在 MarkdownIt 实例上注册 container
 */
function installBlock(md: MarkdownIt, def: BlockDefinition) {
  const componentName = def.componentName || defaultComponentName(def.name)
  const namePattern = new RegExp(`^\\s*${escapeRegex(def.name)}(\\s|$)`)

  md.use(container, def.name, {
    validate: (params: string) => namePattern.test(params.trim() + ' '),
    render(tokens: unknown[], idx: number) {
      const token = tokens[idx] as { nesting: number; info: string }
      if (token.nesting !== 1) return '</vue-block>\n'
      const info = token.info.trim()
      const rest = info.replace(new RegExp(`^${escapeRegex(def.name)}\\s*`), '')
      const parsed = applyParseInfo(def.parseInfo, rest)
      const attrHtml = attrsToDataHtml(parsed)
      const sep = attrHtml ? ' ' : ''
      return `<vue-block data-component="${componentName}"${sep}${attrHtml}>\n`
    },
  })
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 创建 Markdown 解析器（可扩展版）
 *
 * @example
 * ```ts
 * const { parse, md, registry } = useMarkdownParser({
 *   blocks: [
 *     defineBlock({ name: 'job-card', component: JobCardBlock, parseInfo: 'json' }),
 *   ],
 * })
 * const html = parse(':::job-card {"title":"..."}\n:::')
 * ```
 */
export function useMarkdownParser(options: MarkdownParserOptions = {}) {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    ...(options.markdownItOptions || {}),
  })

  const registry = options.registry || createBlockRegistry()

  // 注册内置块
  if (options.includeBuiltin !== false && !options.registry) {
    for (const b of createBuiltinBlocks()) registry.register(b)
  }

  // 注册用户块
  if (options.blocks) {
    for (const b of options.blocks) registry.register(b)
  }

  // 将 registry 中的每个块装到 md
  for (const def of registry.all()) {
    installBlock(md, def)
  }

  function parse(content: string): string {
    const safe = autoCloseContainers(content)
    return md.render(safe)
  }

  return { parse, md, registry }
}

/**
 * 向后兼容：保留 `renderMarkdown(raw)` 快捷函数
 * @deprecated 推荐使用 `useMarkdownParser().parse()`
 */
let _defaultParser: ReturnType<typeof useMarkdownParser> | null = null
export function renderMarkdown(raw: string): string {
  if (!_defaultParser) _defaultParser = useMarkdownParser()
  return _defaultParser.parse(raw)
}
