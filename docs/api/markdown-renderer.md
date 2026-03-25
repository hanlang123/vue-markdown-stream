# MarkdownRenderer

核心渲染组件，将 Markdown 字符串转换为 VNode 树，`<vue-block>` 占位元素被替换为真实 Vue 组件。

## 用法

```vue
<script setup lang="ts">
import { MarkdownRenderer } from '@krishanjinbo/vue-markdown-stream'
</script>

<template>
  <MarkdownRenderer :content="markdownString" @agent:action="handleAction" />
</template>
```

## Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `content` | `string` | **必填** | Markdown 字符串，支持流式追加 |
| `components` | `ComponentMap` | `{}` | 自定义组件注册表（与内置组件合并，用户组件优先） |
| `propsSchemas` | `Record<string, ComponentPropsSchema>` | `{}` | 自定义 Props Schema（与默认 Schema 合并） |
| `enableValidation` | `boolean` | `true` | 是否启用 Props 安全校验 |

## Events

| 事件 | 载荷类型 | 说明 |
|------|---------|------|
| `agent:action` | `AgentActionPayload` | 任何内置或自定义块组件触发的用户交互事件 |

## 渲染流程

```
content
  → autoCloseContainers(content)     处理流式未闭合块
  → md.render(completedMarkdown)     markdown-it 输出 HTML（含 <vue-block>）
  → DOMParser.parseFromString(html)  HTML → DOM 树
  → validateProps(name, rawProps)     Props 白名单校验 + 类型转换
  → domNodeToVNode(node)             递归转为 h() VNode + 事件绑定
  → AgentEventBus                    组件事件 → @agent:action
  → h('div.markdown-body', vnodes)   最终输出
```

## 内置组件注册表

| 组件名 | 块语法 |
|--------|--------|
| `AlertBlock` | `:::alert` |
| `DataCard` | `:::card` |
| `ConfirmBlock` | `:::confirm` |
| `SelectBlock` | `:::select` |
| `FormBlock` | `:::form` |
| `ProgressBlock` | `:::progress` |
| `DataTableBlock` | `:::datatable` |
| `ActionPills` | `:::actions` |

## 样式

输出根元素带 `markdown-body` class。引入内置样式：

```typescript
import '@krishanjinbo/vue-markdown-stream/style.css'
```
