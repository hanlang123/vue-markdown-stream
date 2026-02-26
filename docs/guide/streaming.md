# 流式输出

## Mock 流式输出

内置的 `useStreamingText` 提供了一个演示用的 mock 流式输出：

```typescript
import { useStreamingText } from '@krishanjinbo/vue-markdown-stream'

const { text, isStreaming, startStream, stopStream, resetStream } = useStreamingText()
```

每 30ms 追加 1~3 个随机字符，模拟真实 LLM 输出速度。

## 对接真实 Fetch Stream

```typescript
import { ref } from 'vue'

const text = ref('')
const isStreaming = ref(false)

async function streamFromAPI(prompt: string) {
  isStreaming.value = true
  text.value = ''

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    text.value += decoder.decode(value, { stream: true })
  }

  isStreaming.value = false
}
```

## 对接 SSE（Server-Sent Events）

```typescript
function streamFromSSE(prompt: string) {
  const es = new EventSource(`/api/stream?prompt=${encodeURIComponent(prompt)}`)

  es.addEventListener('message', (e) => {
    text.value += e.data
  })

  es.addEventListener('done', () => {
    es.close()
    isStreaming.value = false
  })

  es.onerror = () => {
    es.close()
    isStreaming.value = false
  }

  isStreaming.value = true
}
```

## 流式中间态处理

当 `:::` 块在流式输出中被截断时（即容器块未闭合），`autoCloseContainers` 会自动在末尾补全：

```
输入（流式中间态）：           自动补全后：
  ::: alert warning            ::: alert warning
  这是一条注意事项             这是一条注意事项
                               :::         ← 自动追加
```

这确保 `markdown-it` 每次都能收到合法输入，避免容器块内容被跳过或错误渲染。

```typescript
import { autoCloseContainers } from '@krishanjinbo/vue-markdown-stream'

// 内部自动调用，你也可以手动使用
const safeMarkdown = autoCloseContainers(streamChunk)
```

## 性能优化

对于高速流式输出（>100 token/s），建议使用 `requestAnimationFrame` 控制渲染频率：

```typescript
import { ref, watch } from 'vue'

const text = ref('')
const renderText = ref('')
let rafId: number

watch(text, (val) => {
  cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => {
    renderText.value = val
  })
})
```

将 `renderText` 而非 `text` 传入 `MarkdownRenderer`，可将渲染次数从每 token 一次降低到每帧至多一次（~60fps）。
