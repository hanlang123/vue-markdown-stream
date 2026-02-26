import { ref } from 'vue'

const MOCK_TEXT = `# 流式 Markdown 渲染演示

这是一个演示**流式输出 Markdown 内容**并将特定块渲染为 Vue 组件的示例。

## 功能特性

- ✅ 流式打字机渲染
- ✅ 普通 Markdown 语法（标题、粗体、代码等）
- ✅ \`:::alert\` 块 → AlertBlock 组件
- ✅ \`:::card\` 块 → DataCard 组件
- ✅ 流式未闭合时自动补全容器

## 代码示例

\`\`\`typescript
const md = new MarkdownIt()
md.use(container, 'alert', {
  render(tokens, idx) {
    return '<vue-block data-component="AlertBlock">'
  }
})
\`\`\`

::: alert info
**渲染原理**：markdown-it-container 的 \`render\` 回调输出自定义 \`<vue-block>\` 占位元素，再由 \`DOMParser\` 递归转为 \`h()\` VNode 树。
:::

## 数据展示

::: card 技术栈对比

| 方案 | 性能 | 体积 |
|------|------|------|
| h() + DOMParser | ✅ 优秀 | ✅ 轻量 |
| compile() | ❌ 每次重编译 | ❌ +14KB |

:::

::: alert warning
未闭合的容器块在流式输出过程中会由 \`autoCloseContainers()\` 自动补全，确保 markdown-it 始终解析到**合法输入**。
:::

::: alert success
✨ 所有功能均已实现！当前页面正是流式渲染的实时效果，块组件完整挂载了 Vue 响应式系统。
:::

::: card 实现步骤

1. **预处理**：\`autoCloseContainers()\` 补全未闭合 \`:::\`
2. **解析**：\`markdown-it\` + \`markdown-it-container\` 输出含 \`<vue-block>\` 的 HTML
3. **转换**：\`DOMParser\` 遍历 DOM，将 \`<vue-block>\` 节点替换为 \`h(Vue组件)\`
4. **渲染**：\`MarkdownRenderer\` 组件通过 render 函数返回 VNode 树

:::

::: alert error
注意：此方案仅适用于**客户端渲染**场景，SSR 环境下需将 \`DOMParser\` 替换为 \`parse5\`。
:::

---

🎉 流式输出完成！
`

/**
 * Mock 流式文本输出
 * 模拟 AI 逐字输出场景
 */
export function useStreamingText() {
  const text = ref('')
  const isStreaming = ref(false)
  let timer: ReturnType<typeof setInterval> | null = null
  let position = 0

  function startStream() {
    if (isStreaming.value) return

    isStreaming.value = true
    position = text.value.length // 支持续播

    timer = setInterval(() => {
      if (position >= MOCK_TEXT.length) {
        stopStream()
        return
      }
      // 每次追加 1~3 个字符，模拟真实流式速度
      const chunkSize = Math.floor(Math.random() * 3) + 1
      text.value += MOCK_TEXT.slice(position, position + chunkSize)
      position += chunkSize
    }, 30)
  }

  function stopStream() {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
    isStreaming.value = false
  }

  function resetStream() {
    stopStream()
    text.value = ''
    position = 0
  }

  return {
    text,
    isStreaming,
    startStream,
    stopStream,
    resetStream,
  }
}
