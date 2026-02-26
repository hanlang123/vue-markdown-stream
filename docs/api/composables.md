# Composables

## `useStreamingText`

模拟流式打字机输出的 composable，适用于 Demo 和开发调试。

### 返回值

```typescript
const {
  text,         // Ref<string>   — 当前已输出的完整文本
  isStreaming,  // Ref<boolean>  — 是否正在输出
  startStream,  // () => void    — 开始/继续输出
  stopStream,   // () => void    — 暂停（保留进度）
  resetStream,  // () => void    — 重置到初始状态
} = useStreamingText()
```

### 行为

- `startStream()` 每 30ms 追加 1~3 个随机字符
- 重复调用 `startStream()` 无效（防止多次触发）
- `stopStream()` 后再次调用 `startStream()` 会从暂停位置继续
- `resetStream()` 会同时停止输出并清空 `text`

### 打字机光标

在流式输出时追加光标字符 `▍`：

```typescript
import { computed } from 'vue'

const display = computed(() =>
  isStreaming.value ? text.value + '▍' : text.value
)
```

### 对接真实 API

```typescript
import { ref } from 'vue'

const text = ref('')
const isStreaming = ref(false)

async function streamFromFetch(url: string, body: object) {
  isStreaming.value = true
  text.value = ''

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      text.value += decoder.decode(value, { stream: true })
    }
  } finally {
    isStreaming.value = false
  }
}
```

## `renderMarkdown`

底层 Markdown 渲染函数，内部调用了 `autoCloseContainers`。

```typescript
import { renderMarkdown } from 'vue-markdown-stream'

const html: string = renderMarkdown('# Hello\n::: alert info\n内容\n:::')
```

**返回值：** 包含 `<vue-block>` 占位元素的 HTML 字符串（供 `MarkdownRenderer` 内部使用）。通常不需要直接调用此函数。
