import { ref } from 'vue'

const MOCK_TEXT = `# Agent UI Protocol 演示

这是一个演示 **Agent UI Protocol v2** 流式输出 + 交互组件的示例。

## 基础 Markdown 渲染

- ✅ 流式打字机渲染
- ✅ 普通 Markdown 语法（标题、粗体、代码等）
- ✅ \`:::alert\` 块 → AlertBlock 组件
- ✅ \`:::card\` 块 → DataCard 组件

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

## v2 新增：交互组件

### 确认操作

::: confirm action="delete_user" level=danger
确认要删除用户 **张三** 吗？此操作不可撤销。
:::

### 进度展示

::: progress value=73 max=100 status=active
正在导入数据... 已处理 73/100 条
:::

### 数据表格

::: datatable sortable filterable
| 姓名 | 部门 | 状态 |
|------|------|------|
| 张三 | 研发 | 在线 |
| 李四 | 产品 | 离线 |
| 王五 | 设计 | 忙碌 |
:::

### 快捷操作

::: actions
- 查看处理进度
- 生成报告
- 导出数据
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
✨ Agent UI Protocol v2 已就绪！支持 Confirm / Select / Form / Progress / DataTable / Actions 等交互组件。
:::

### Artifact 内容块

以下是 Artifact 机制示例，类似 Claude Code 的 Artifact 面板，支持代码、HTML、SVG、文档等内容类型：

::: artifact type="code" lang="typescript" title="EventBus 示例"
import { createAgentEventBus } from 'vue-markdown-stream'

const bus = createAgentEventBus()

bus.on((payload) => {
  console.log('Action:', payload.event)
  console.log('Data:', payload.data)
})

// 组件内部触发
bus.emit({
  blockId: 'demo-1',
  event: 'confirm',
  componentType: 'ConfirmBlock',
  data: { action: 'delete', confirmed: true },
})
:::

::: artifact type="html" title="HTML 预览卡片"
<div style="padding:16px; background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); border-radius:8px; color:white; text-align:center;">
<h3 style="margin:0 0 8px 0;">Hello Artifact!</h3>
<p style="margin:0; opacity:0.9;">这是一个可预览的 HTML Artifact</p>
</div>
:::

::: artifact type="svg" title="Vue Logo"
<svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><polygon points="60,10 110,100 10,100" fill="#42b883"/><polygon points="60,30 90,90 30,90" fill="#35495e"/></svg>
:::

::: artifact type="document" title="项目 README"
**vue-markdown-stream** 是一个基于 Vue 3 的流式 Markdown 渲染库。

- 支持 AI Agent 流式输出
- 内置 9 种交互组件块
- 完整的事件回传机制
:::

::: card 实现步骤

1. **预处理**：\`autoCloseContainers()\` 补全未闭合 \`:::\`
2. **解析**：\`markdown-it\` + \`markdown-it-container\` 输出含 \`<vue-block>\` 的 HTML
3. **校验**：\`PropValidator\` 对 Props 进行白名单校验 + 清洗
4. **转换**：\`DOMParser\` 遍历 DOM，将 \`<vue-block>\` 替换为 \`h(Vue组件)\`
5. **事件**：\`AgentEventBus\` 将组件交互事件传递给宿主应用
6. **渲染**：\`MarkdownRenderer\` 组件通过 render 函数返回 VNode 树

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
