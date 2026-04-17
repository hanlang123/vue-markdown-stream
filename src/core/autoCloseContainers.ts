const CONTAINER_PATTERN = /^:::\s*(\w+)/
const CODE_FENCE_OPEN = /^(`{3,}|~{3,})(\w*)/
const MATH_BLOCK_DELIM = /^\$\$/

/**
 * 自动补全未闭合的 ::: 容器块、代码围栏和 $$ 数学块
 *
 * 增强点（v2）:
 * - 支持嵌套容器块的正确补全
 * - 支持 ::: 后带属性参数的容器
 * - 支持未闭合的 ``` 代码围栏（Mermaid 等流式场景）
 * - 支持未闭合的 $$ 数学公式块（LaTeX 流式场景）
 */
export function autoCloseContainers(content: string): string {
  const lines = content.split('\n')
  const openStack: string[] = []  // 记录打开的容器类型

  let inCodeFence = false
  let codeFenceMarker = '' // 记录开启围栏使用的字符（` 或 ~）和长度
  let inMathBlock = false

  for (const line of lines) {
    const trimmed = line.trim()

    // 代码围栏状态机（优先级最高，围栏内不解析其他语法）
    if (inCodeFence) {
      // 只有匹配到相同或更长的围栏标记才关闭
      if (trimmed.startsWith(codeFenceMarker) && trimmed.replace(/`/g, '').replace(/~/g, '').trim() === '') {
        inCodeFence = false
        codeFenceMarker = ''
      }
      continue
    }

    const fenceMatch = trimmed.match(CODE_FENCE_OPEN)
    if (fenceMatch) {
      inCodeFence = true
      codeFenceMarker = fenceMatch[1]!
      continue
    }

    // $$ 数学块状态机
    if (MATH_BLOCK_DELIM.test(trimmed)) {
      if (inMathBlock) {
        inMathBlock = false
      } else {
        // 只有独立的 $$ 行才标记为块开启（不是 $$ ... $$ 同行）
        const dollarCount = (trimmed.match(/\$\$/g) || []).length
        if (dollarCount === 1) {
          inMathBlock = true
        }
        // 如果同行有两个 $$（即 $$ content $$），不标记为打开
      }
      continue
    }

    // ::: 容器块状态机
    if (trimmed === ':::') {
      // 关闭最近一个打开的容器
      if (openStack.length > 0) {
        openStack.pop()
      }
    } else if (CONTAINER_PATTERN.test(trimmed)) {
      // 打开一个新容器
      openStack.push(trimmed)
    }
  }

  // 补全所有未关闭的块
  let suffix = ''

  // 先关闭代码围栏
  if (inCodeFence) {
    suffix += '\n' + codeFenceMarker
  }

  // 再关闭数学块
  if (inMathBlock) {
    suffix += '\n$$'
  }

  // 最后关闭容器块（从内到外）
  if (openStack.length > 0) {
    const closings = openStack.map(() => ':::').join('\n')
    suffix += '\n' + closings
  }

  return suffix ? content + suffix : content
}
