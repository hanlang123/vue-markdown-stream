import type { BlockDefinition } from './blockRegistry'

/**
 * 从一组 BlockDefinition 生成可直接塞进 LLM system prompt 的 Markdown 文档
 *
 * @example
 * ```ts
 * const { registry } = useMarkdownParser({ blocks: [...] })
 * const prompt = generateBlockPromptDocs(registry.all())
 * ```
 */
export function generateBlockPromptDocs(
  blocks: BlockDefinition[],
  opts: { title?: string; intro?: string } = {},
): string {
  const lines: string[] = []
  lines.push(`# ${opts.title || 'Available Markdown Blocks'}`)
  lines.push('')
  lines.push(
    opts.intro ||
      '以下容器块可在 Markdown 中使用，语法为 `:::<name> <params>\\n...\\n:::`。',
  )
  lines.push('')

  for (const b of blocks) {
    lines.push(`## \`:::${b.name}\``)
    if (b.docs?.description) lines.push(b.docs.description)

    const strategy = typeof b.parseInfo === 'function' ? 'custom' : b.parseInfo || 'attrs'
    lines.push('')
    lines.push(`**Params style**: \`${strategy}\``)

    if (b.docs?.fields && b.docs.fields.length > 0) {
      lines.push('')
      lines.push('**Fields**:')
      for (const f of b.docs.fields) {
        const enumPart = f.enum ? ` (${f.enum.join(' | ')})` : ''
        const descPart = f.description ? ` — ${f.description}` : ''
        lines.push(`- \`${f.name}\`: ${f.type}${enumPart}${descPart}`)
      }
    }

    if (b.docs?.example) {
      lines.push('')
      lines.push('**Example**:')
      lines.push('```markdown')
      lines.push(b.docs.example)
      lines.push('```')
    }

    lines.push('')
  }

  return lines.join('\n')
}
