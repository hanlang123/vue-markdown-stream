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
| `raw` | `string` | 原始 Markdown 字符串（可能含未闭合 `:::` 块） |

### 返回值

`string` — 补全所有未闭合块后的 Markdown 字符串。若无未闭合块，原样返回（零开销）。

### 工作原理

逐行扫描 `:::` 开标记（`/^:::\s+\S/`）和闭标记（`:::`），用栈跟踪嵌套深度，在末尾追加缺失的关闭标记：

```
输入：               输出：
:::  alert info      ::: alert info
  内容...              内容...
                     :::           ← 自动追加
```

---

## `htmlToVnodes`

将包含 `<vue-block>` 占位元素的 HTML 字符串转换为 VNode 数组。

```typescript
import { htmlToVnodes, type ComponentMap } from '@krishanjinbo/vue-markdown-stream'
import { h } from 'vue'

const componentMap: ComponentMap = {
  MyBlock: MyBlockComponent,
}

const vnodes = htmlToVnodes('<p>Hello</p><vue-block data-component="MyBlock" data-type="warning">content</vue-block>', componentMap)
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `html` | `string` | 含 `<vue-block>` 的 HTML 字符串 |
| `componentMap` | `ComponentMap` | 组件名 → Vue Component 的映射表 |

### 返回值

`(VNode | string)[]` — VNode 数组，可直接传入 `h()` 的 children 参数。

### 转换规则

| HTML 节点 | 转换结果 |
|-----------|---------|
| `<vue-block data-component="Foo">` | `h(componentMap['Foo'], props, slots)` |
| `<vue-block>` 找不到组件 | `h('div', { innerHTML: ... })` 降级 |
| 普通 HTML 元素 | `h(tag, attrs, children)` 递归 |
| 文本节点 | 字符串 |
| 注释节点 | 忽略 |

### `ComponentMap` 类型

```typescript
import type { Component } from 'vue'

type ComponentMap = Record<string, Component>
```
