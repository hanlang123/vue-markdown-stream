/**
 * 流式输出场景下自动补全未闭合的 ::: 容器块
 * markdown-it-container 需要完整的开闭标记才能正确解析
 *
 * 例如流式输出到一半：
 *   ::: alert warning
 *   这是一条
 *
 * 会被补全为：
 *   ::: alert warning
 *   这是一条
 *   :::
 */
export function autoCloseContainers(raw: string): string {
  const lines = raw.split('\n')
  const stack: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    // 匹配开标记 ::: xxx（后面有内容）
    if (/^:::\s+\S/.test(trimmed)) {
      stack.push(trimmed)
      continue
    }

    // 匹配闭标记 ::: (仅三冒号)
    if (trimmed === ':::') {
      stack.pop()
    }
  }

  // 补全所有未闭合的块
  if (stack.length === 0) return raw

  return raw + '\n' + stack.map(() => ':::').join('\n')
}
