# Artifact 内容块

Artifact 是 v2 新增的内容展示组件，灵感来自 Claude Code 的 Artifact 机制。它支持将 LLM 生成的**代码、HTML、SVG、文档**等独立内容渲染为可交互的面板，用户可以**复制、下载、折叠/展开**内容。

## 什么是 Artifact？

在 AI Agent 对话场景中，LLM 经常需要生成「独立的内容产物」，例如：

- 一段完整的代码实现
- 一个 HTML 页面预览
- 一个 SVG 图标/图表
- 一份文档或报告

这些内容不同于普通的聊天消息，它们是**可独立存储、复制、下载**的产物。Artifact 组件将这些内容以面板形式呈现，提供比普通代码块更丰富的交互能力。

## 基础用法

### 代码 Artifact

```markdown
::: artifact type="code" lang="python" title="Hello World"
print("Hello, World!")
for i in range(5):
    print(f"  Item {i}")
:::
```

### HTML Artifact

```markdown
::: artifact type="html" title="预览卡片"
<div style="padding: 16px; background: #f0f9ff; border-radius: 8px;">
  <h3>Hello!</h3>
  <p>这是一个可预览的 HTML Artifact</p>
</div>
:::
```

### SVG Artifact

```markdown
::: artifact type="svg" title="Vue Logo"
<svg width="120" height="120" viewBox="0 0 120 120">
  <polygon points="60,10 110,100 10,100" fill="#42b883"/>
  <polygon points="60,30 90,90 30,90" fill="#35495e"/>
</svg>
:::
```

### 文档 Artifact

```markdown
::: artifact type="document" title="会议纪要"
**日期**: 2026-01-15

## 讨论内容
- 项目进度回顾
- 技术方案确认
- 下一步计划
:::
```

## 属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `type` | `'code' \| 'html' \| 'svg' \| 'document' \| 'mermaid' \| 'text'` | `'code'` | 内容类型，决定渲染方式 |
| `lang` | `string` | `''` | 代码语言（仅 `type="code"` 时有效），用于显示和下载文件扩展名 |
| `title` | `string` | `''` | Artifact 标题，显示在面板头部 |

## 内容类型说明

### `code` — 代码

以暗色主题代码块渲染，支持复制和下载为对应语言的源文件。

支持的 `lang` 值及对应下载扩展名：

| lang | 扩展名 | lang | 扩展名 |
|------|--------|------|--------|
| `javascript` | `.js` | `typescript` | `.ts` |
| `python` | `.py` | `java` | `.java` |
| `go` | `.go` | `rust` | `.rs` |
| `vue` | `.vue` | `html` | `.html` |
| `css` | `.css` | `json` | `.json` |
| `sql` | `.sql` | `bash` / `shell` | `.sh` |
| 其他 | `.txt` | | |

### `html` — HTML 预览

直接渲染 HTML 内容，实现所见即所得的预览效果。

### `svg` — SVG 图形

居中展示 SVG 图形，自动适配容器宽度。

### `document` — 文档

渲染 Markdown 转换后的 HTML 内容，适合展示报告、笔记等结构化文档。

### `mermaid` — 流程图（文本形式）

展示 Mermaid 图表源码。（后续可集成 Mermaid 渲染引擎）

### `text` — 纯文本

通用的文本内容展示。

## 交互功能

### 📋 复制

点击头部的复制按钮，将 Artifact 内容复制到剪贴板。

### ⬇️ 下载

点击下载按钮，将内容保存为文件。文件名基于 `title` 属性，扩展名根据 `type` 和 `lang` 自动确定。

### ▼ 折叠/展开

点击头部区域或折叠按钮，可以折叠或展开内容区域。对于长内容（如大段代码），折叠功能有助于保持界面整洁。

## 事件

Artifact 组件通过 `agent-action` 事件回传用户交互：

| 事件 | 触发时机 | data |
|------|----------|------|
| `copy` | 用户点击复制 | `{ type, title }` |
| `download` | 用户点击下载 | `{ type, title, filename }` |
| `toggle` | 用户切换折叠状态 | `{ type, title, collapsed }` |

### 事件处理示例

```vue
<script setup lang="ts">
import { MarkdownRenderer, useAgentEvents } from '@krishanjinbo/vue-markdown-stream'

const { createHandler } = useAgentEvents()

const handleAction = createHandler(async (payload) => {
  if (payload.componentType === 'ArtifactBlock') {
    switch (payload.event) {
      case 'copy':
        console.log(`用户复制了 ${payload.data.title}`)
        break
      case 'download':
        console.log(`用户下载了 ${payload.data.filename}`)
        break
      case 'toggle':
        console.log(`Artifact ${payload.data.collapsed ? '已折叠' : '已展开'}`)
        break
    }
  }
})
</script>

<template>
  <MarkdownRenderer :content="text" @agent:action="handleAction" />
</template>
```

## 完整示例

以下展示一个 AI Agent 生成多种 Artifact 的场景：

```markdown
我已经为您生成了以下内容：

::: artifact type="code" lang="vue" title="UserProfile.vue"
<script setup lang="ts">
defineProps<{
  name: string
  email: string
}>()
</script>

<template>
  <div class="profile">
    <h2>{{ name }}</h2>
    <p>{{ email }}</p>
  </div>
</template>
:::

这个组件的预览效果如下：

::: artifact type="html" title="组件预览"
<div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
  <h2 style="margin: 0 0 8px;">张三</h2>
  <p style="margin: 0; color: #6b7280;">zhangsan@example.com</p>
</div>
:::

项目结构如下：

::: artifact type="document" title="目录结构"
- `src/`
  - `components/`
    - `UserProfile.vue` ← 新建
  - `App.vue`
  - `main.ts`
:::
```

## 安全说明

- Artifact 的 `type`、`lang`、`title` 属性经过 PropValidator 白名单校验
- `type` 只允许预定义的枚举值，`lang` 和 `title` 有长度限制
- 全局黑名单（`onclick`、`style`、`href` 等）始终生效
- 对于 `html` 类型，内容经过 markdown-it 处理后渲染，而非直接执行原始 HTML

::: warning 注意
`html` 和 `svg` 类型的 Artifact 会渲染 HTML 内容。在生产环境中，建议对 LLM 输出的 HTML 内容做额外的 XSS 过滤（如使用 DOMPurify），以增强安全性。
:::
