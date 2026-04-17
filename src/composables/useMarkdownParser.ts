import MarkdownIt from 'markdown-it'
import container from 'markdown-it-container'
import footnote from 'markdown-it-footnote'
import { katex as katexPlugin } from '@mdit/plugin-katex'
import { autoCloseContainers } from '../core/autoCloseContainers'

/**
 * useMarkdownParser 的配置选项
 */
export interface MarkdownParserOptions {
  /** 是否启用脚注支持（默认 true） */
  footnote?: boolean
  /** 是否启用 LaTeX 数学公式（默认 true） */
  math?: boolean
  /** 是否启用 Mermaid 图表（默认 true） */
  mermaid?: boolean
}

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
    attrs[match[1]!] = match[2] ?? match[3] ?? ''
  }
  // 匹配独立的布尔属性（无 = 号）
  const boolRegex = /(?:^|\s)(\w[\w-]*)(?=\s|$)/g
  const cleaned = attrStr.replace(/(\w[\w-]*)=(?:"([^"]*)"|(\S+))/g, '')
  while ((match = boolRegex.exec(cleaned)) !== null) {
    attrs[match[1]!] = 'true'
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
        const safeTitle = title.replace(/"/g, '&quot;')
        return `<vue-block data-component="DataCard" data-title="${safeTitle}">\n`
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
  {
    name: 'artifact',
    validate: (params: string) => /^\s*artifact/.test(params.trim()),
    render: (tokens: any[], idx: number) => {
      const token = tokens[idx]
      if (token.nesting === 1) {
        const info = token.info.trim()
        const attrs = parseBlockAttributes(info.replace(/^artifact\s*/, ''))
        return `<vue-block data-component="ArtifactBlock" ${attrsToDataString(attrs)}>\n`
      }
      return '</vue-block>\n'
    },
  },
]

/**
 * 创建 Markdown 解析器（增强版）
 *
 * @param options - 可选配置，按需启用/禁用功能模块
 */
export function useMarkdownParser(options: MarkdownParserOptions = {}) {
  const { footnote: enableFootnote = true, math: enableMath = true, mermaid: enableMermaid = true } = options

  const md = new MarkdownIt({ html: true, linkify: true, typographer: true })

  // 注册脚注插件
  if (enableFootnote) {
    md.use(footnote)
  }

  // 注册 KaTeX 数学公式插件
  if (enableMath) {
    md.use(katexPlugin, {
      throwOnError: false,
      mathFence: true,
    })
  }

  // 自定义 fence 渲染器 — Mermaid 代码块输出为 vue-block
  if (enableMermaid) {
    const defaultFenceRenderer = md.renderer.rules.fence
    md.renderer.rules.fence = (tokens, idx, options, env, self) => {
      const token = tokens[idx]!
      const info = token.info ? token.info.trim() : ''

      if (info === 'mermaid') {
        // 将 mermaid 代码编码为 data-code 属性
        const code = token.content
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
        return `<vue-block data-component="MermaidBlock" data-code="${code}"></vue-block>\n`
      }

      // 非 mermaid 代码块使用默认渲染
      if (defaultFenceRenderer) {
        return defaultFenceRenderer(tokens, idx, options, env, self)
      }
      return self.renderToken(tokens, idx, options)
    }
  }

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

/**
 * 向后兼容 v1 的 renderMarkdown 函数
 * @deprecated 请使用 useMarkdownParser().parse() 代替
 */
const _parser = /* @__PURE__ */ (() => {
  const { parse } = useMarkdownParser()
  return parse
})()

export function renderMarkdown(raw: string): string {
  return _parser(raw)
}
