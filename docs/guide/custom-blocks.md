# 自定义块组件

## 内置块

### `:::alert`

```markdown
::: alert info
信息提示
:::

::: alert success
成功提示
:::

::: alert warning
注意提示
:::

::: alert error
错误提示
:::
```

**效果预览：** 带图标和颜色边框的提示卡片，`type` 控制颜色主题。

---

### `:::card`

```markdown
::: card 卡片标题

支持 **Markdown** 内容、表格：

| 列A | 列B |
|-----|-----|
| 值1 | 值2 |

:::
```

## 注册自定义块

以注册一个 `:::chart` 块为例，渲染为图表组件：

### 第 1 步：创建组件

```vue
<!-- src/components/blocks/ChartBlock.vue -->
<script setup lang="ts">
defineProps<{
  type?: 'bar' | 'line' | 'pie'
  title?: string
}>()
</script>

<template>
  <div class="chart-block">
    <div class="chart-title">{{ title }}</div>
    <!-- 接收 slot 中的数据 -->
    <slot />
  </div>
</template>
```

### 第 2 步：注册 markdown-it-container

在 `src/composables/useMarkdownParser.ts` 中追加：

```typescript
import ChartBlock from '../components/blocks/ChartBlock.vue'

md.use(container, 'chart', {
  validate(params: string) {
    return /^chart/.test(params.trim())
  },
  render(tokens: any[], idx: number) {
    const token = tokens[idx]
    if (token.nesting === 1) {
      const info = token.info.trim()
      const typeMatch = info.match(/type=(\S+)/)
      const titleMatch = info.match(/title="([^"]*)"/)
      const type = typeMatch?.[1] || 'bar'
      const title = titleMatch?.[1] || ''
      return `<vue-block data-component="ChartBlock" data-type="${type}" data-title="${title}">\n`
    }
    return '</vue-block>\n'
  },
})
```

### 第 3 步：加入 componentMap

在 `src/components/MarkdownRenderer.ts` 中：

```typescript
import ChartBlock from './blocks/ChartBlock.vue'

const componentMap: ComponentMap = {
  AlertBlock,
  DataCard,
  ChartBlock,  // ← 添加这一行
}
```

### 使用

```markdown
::: chart type=bar title="月度数据"
- 一月: 120
- 二月: 95
- 三月: 150
:::
```

## Props 传递规则

`data-*` 属性会被自动提取为 props（去掉 `data-` 前缀）：

| Markdown 属性 | 组件 prop |
|---------------|-----------|
| `data-type="warning"` | `type="warning"` |
| `data-title="标题"` | `title="标题"` |
| `data-color="#ff6b35"` | `color="#ff6b35"` |

所有 props 值均为**字符串类型**，组件内可用 `computed` 做类型转换。

## Slot 内容

`<vue-block>` 标签内的内容（已被 markdown-it 渲染为 HTML）会作为 `default slot` 传入组件。组件使用 `<slot />` 接收即可。
