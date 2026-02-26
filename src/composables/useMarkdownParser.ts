import MarkdownIt from 'markdown-it'
import container from 'markdown-it-container'
import { autoCloseContainers } from '../utils/autoClose'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
})

// ::: alert [type]
// type: info | success | warning | error
md.use(container, 'alert', {
  validate(params: string) {
    return /^alert(\s+(info|success|warning|error))?/.test(params.trim())
  },
  render(tokens: any[], idx: number) {
    const token = tokens[idx]
    if (token.nesting === 1) {
      const match = token.info.trim().match(/^alert\s*(\S*)/)
      const type = match?.[1] || 'info'
      return `<vue-block data-component="AlertBlock" data-type="${type}">\n`
    }
    return '</vue-block>\n'
  },
})

// ::: card [title]
md.use(container, 'card', {
  validate(params: string) {
    return /^card/.test(params.trim())
  },
  render(tokens: any[], idx: number) {
    const token = tokens[idx]
    if (token.nesting === 1) {
      const match = token.info.trim().match(/^card\s*(.*)/)
      const title = match?.[1]?.trim() || ''
      const safeTitle = title.replace(/"/g, '&quot;')
      return `<vue-block data-component="DataCard" data-title="${safeTitle}">\n`
    }
    return '</vue-block>\n'
  },
})

/**
 * 将 markdown 字符串渲染为 HTML
 * 流式场景下会自动补全未闭合的容器块
 */
export function renderMarkdown(raw: string): string {
  const completed = autoCloseContainers(raw)
  return md.render(completed)
}
