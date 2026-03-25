# 工具函数

## `autoCloseContainers`

自动补全流式 Markdown 中未闭合的 `:::` 容器块。

```typescript
import { autoCloseContainers } from '@krishanjinbo/vue-markdown-stream'

const safeMarkdown = autoCloseContainers(streamChunk)
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `content` | `string` | 原始 Markdown 字符串（可能含未闭合 `:::` 块） |

### 返回值

`string` — 补全所有未闭合块后的 Markdown 字符串。若无未闭合块，原样返回。

### 工作原理

逐行扫描 `:::` 开标记和闭标记，用栈跟踪嵌套深度，在末尾追加缺失的关闭标记：

```
输入：               输出：
::: alert info       ::: alert info
  内容...              内容...
                     :::           ← 自动追加
```

v2 增强：支持所有新容器块类型（confirm、select、form、progress、datatable、actions）的正确补全。
