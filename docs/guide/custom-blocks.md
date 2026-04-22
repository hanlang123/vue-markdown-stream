# 自定义块组件

## 内置块

v2 内置 8 个块组件：

| 块语法 | 组件 | 说明 |
|--------|------|------|
| `:::alert` | AlertBlock | 告警提示（info/success/warning/error） |
| `:::card` | DataCard | 数据卡片 |
| `:::confirm` | ConfirmBlock | 确认操作 |
| `:::select` | SelectBlock | 选择/消歧 |
| `:::form` | FormBlock | 动态表单 |
| `:::progress` | ProgressBlock | 进度展示 |
| `:::datatable` | DataTableBlock | 数据表格 |
| `:::actions` | ActionPills | 快捷操作气泡 |
| `:::artifact` | ArtifactBlock | Artifact 内容面板（代码/HTML/SVG/文档） |

详细用法见 [Agent 交互组件](./agent-blocks)。

### `:::alert`

```markdown
::: alert info
信息提示
:::

::: alert warning
注意提示
:::
```

### `:::card`

```markdown
::: card 卡片标题
支持 **Markdown** 内容、表格等。
:::
```

## 通过 `defineBlock` 注册自定义块 <Badge type="tip" text="v3 推荐" />

v3 提供 `defineBlock` 统一 API —— **一行声明**即可打通 markdown-it 容器、componentMap、info-string 解析、Props 校验、LLM prompt 文档。

```vue
<script setup lang="ts">
import { MarkdownRenderer, defineBlock } from '@krishanjinbo/vue-markdown-stream'
import JobCardBlock from './components/JobCardBlock.vue'
import SkillRadarBlock from './components/SkillRadarBlock.vue'

const blocks = [
  defineBlock({
    name: 'job-card',
    component: JobCardBlock,
    parseInfo: 'json',              // :::job-card {"title":"..."}
  }),
  defineBlock({
    name: 'skill-radar',
    component: SkillRadarBlock,
    parseInfo: 'json',
    schema: { items: { type: 'array', maxLength: 20 } },
    docs: {
      description: '技能雷达图',
      example: '::: skill-radar {"items":[{"name":"Vue","score":9}]}\n\n:::',
    },
  }),
]
</script>

<template>
  <MarkdownRenderer :content="text" :blocks="blocks" streaming />
</template>
```

### `parseInfo` 四种策略

| 策略 | `:::` 语法 | 组件 props |
|------|-----------|-----------|
| `'attrs'`（默认） | `:::confirm action=delete level=danger` | `{ action, level }` |
| `'json'` | `:::job-card {"title":"前端"}` | 整个对象注入 `data-props` |
| `'title'` | `:::card 技术栈对比` | `{ title: '技术栈对比' }` |
| `(rest) => {...}` | 自定义函数 | 返回对象；`__props` 字段会进 JSON payload |

### 工厂式：一次配置，全应用复用

```typescript
// app/markdown.ts
import { createMarkdownStream, defineBlock } from '@krishanjinbo/vue-markdown-stream'
import JobCard from './blocks/JobCard.vue'

export const { MarkdownRenderer } = createMarkdownStream({
  blocks: [defineBlock({ name: 'job-card', component: JobCard, parseInfo: 'json' })],
})

// 任意页面
// <MarkdownRenderer :content="text" streaming />
```

详见 [Block Registry API](../api/block-registry) 与 [createMarkdownStream](../api/composables#createmarkdownstream)。

## 通过 Props 注册自定义组件（v2 兼容写法）

如果你还在用 v2 的 `components` prop，完全兼容：

```vue
<script setup lang="ts">
import { MarkdownRenderer } from '@krishanjinbo/vue-markdown-stream'
import MyChartBlock from './components/MyChartBlock.vue'

const customComponents = {
  ChartBlock: MyChartBlock,
}

const customSchemas = {
  ChartBlock: {
    allowed: {
      type: { type: 'enum', enum: ['bar', 'line', 'pie'], default: 'bar' },
      title: { type: 'string', maxLength: 50 },
    },
  },
}
</script>

<template>
  <MarkdownRenderer
    :content="text"
    :components="customComponents"
    :props-schemas="customSchemas"
  />
</template>
```

::: tip
自定义组件会与内置组件**合并**，同名时用户组件优先。新项目建议使用 `defineBlock` —— 它在 v2 机制之上补齐了 info-string 解析、docs 元信息与 LLM prompt 生成。
:::

## Props 传递规则

`data-*` 属性会被自动提取并转换为 props：

| Markdown 属性 | 转换 | 组件 prop |
|---------------|------|-----------|
| `data-type="warning"` | kebab→camelCase | `type="warning"` |
| `data-confirm-text="OK"` | kebab→camelCase | `confirmText="OK"` |

v2 新增 **PropValidator** 对 props 做类型转换：

| Schema 类型 | 转换规则 |
|-------------|---------|
| `string` | 截断到 `maxLength` |
| `number` | `Number()` + `min`/`max` clamp |
| `boolean` | `'true'`/`'1'`/`'yes'` → `true` |
| `enum` | 不在允许列表内 → `default` |

## Slot 内容

`<vue-block>` 标签内的内容（已被 markdown-it 渲染为 HTML）会作为 `default slot` 传入组件。组件使用 `<slot />` 接收即可。

## 安全机制

Props 经过两层过滤：

1. **全局黑名单** — `onclick`、`innerHTML`、`style`、`href`、`src` 等危险属性永远被过滤
2. **组件白名单** — 每个组件只接受 schema 中声明的 props，未声明的被丢弃
