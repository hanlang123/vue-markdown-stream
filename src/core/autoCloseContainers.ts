const CONTAINER_PATTERN = /^:::\s*(\w+)/

/**
 * 自动补全未闭合的 ::: 容器块
 *
 * 增强点（v2）:
 * - 支持嵌套容器块的正确补全
 * - 支持 ::: 后带属性参数的容器
 */
export function autoCloseContainers(content: string): string {
  const lines = content.split('\n')
  const openStack: string[] = []  // 记录打开的容器类型

  for (const line of lines) {
    const trimmed = line.trim()

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

  // 补全所有未关闭的容器（从内到外）
  if (openStack.length > 0) {
    const closings = openStack.map(() => ':::').join('\n')
    return content + '\n' + closings
  }

  return content
}
