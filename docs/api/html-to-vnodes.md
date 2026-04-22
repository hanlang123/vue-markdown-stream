# htmlToVnodes <Badge type="tip" text="v3" />

底层工具：将 markdown-it 输出的 HTML 字符串转换为 Vue VNode 树，自动把 `<vue-block>` 占位元素替换为注册表中的真实 Vue 组件。

`MarkdownRenderer` 内部就用它；如果你想自己组装渲染管线，可以直接调用。

## 用法

```typescript
import {
  htmlToVnodes,
  createAgentEventBus,
  defaultSchemas,
  builtinComponentMap,
} from '@krishanjinbo/vue-markdown-stream'
import { h } from 'vue'

const html = `<p>hi</p><vue-block data-component="AlertBlock" data-type="info"></vue-block>`

const vnodes = htmlToVnodes(html, {
  componentMap: builtinComponentMap,
  schemas: defaultSchemas,
  eventBus: createAgentEventBus((payload) => console.log(payload)),
  enableValidation: true,
  stableKey: true,
})

// 接着自己放进任意容器
h('div', { class: 'markdown-body' }, vnodes)
```

## 签名

```typescript
function htmlToVnodes(html: string, options: HtmlToVnodesOptions): VNode[]
```

### `HtmlToVnodesOptions`

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `componentMap` | `ComponentMap` | **必填** | `data-component` → Vue 组件的映射 |
| `schemas` | `Record<string, ComponentPropsSchema>` | — | Props 白名单校验 Schema |
| `eventBus` | `AgentEventBus` | — | 事件总线；若传入，组件触发的用户交互会转发到此 |
| `enableValidation` | `boolean` | `true` | 是否启用 Props 校验 |
| `stableKey` | `boolean` | `true` | 稳定 key 策略：`data-id` > `data-props` hash > `{component}:{index}`。关闭则由 Vue 自身 diff |
| `propsCache` | `Map<string, Record<string, unknown>>` | 内置单例 | JSON props 缓存；相同 encoded 原文返回同一对象引用。流式场景可传入自己的 Map 以跨次调用保持引用稳定 |

## `resolveJsonProps(encoded, cache?)`

从 `data-props` 属性中还原 JSON 对象，复用缓存保证引用稳定。

```typescript
import { resolveJsonProps } from '@krishanjinbo/vue-markdown-stream'

const cache = new Map()
const props = resolveJsonProps(encodedString, cache)
// encodedString 相同 → 返回同一引用
```

用于：需要在宿主侧读取 block 原始 payload、或在自定义渲染管线中绕过 `htmlToVnodes` 时。

## 稳定 key 策略

流式渲染时 Vue 的 diff 算法需要稳定 key，否则会大量重建子组件。`htmlToVnodes` 按以下优先级生成 key：

1. `data-id` 属性（调用方显式指定）
2. `data-props` 属性的 hash（JSON payload 相同 → 同 key）
3. `{component}:{index}` 回退

## 安全加固

`htmlToVnodes` 在转换时会：

- 白名单属性：仅保留 `data-*` / `aria-*` / `role` / `class` / `id` 等安全属性
- **剥离** `on*` 事件属性、`style`、危险 URL 协议（`javascript:` / `data:` 非图像 / `vbscript:` / `file:`）
- 未注册的 `data-component` 会被降级为 fallback 占位（不抛异常）
- 非法的 `data-props`（JSON 解析失败）静默忽略，适配流式中间态

详见 `propValidator` 的 [Props 校验](./prop-validator) 文档。

## 常见场景

### 想完全自定义渲染容器

```typescript
const vnodes = htmlToVnodes(html, { componentMap, eventBus })
return h('article', { class: 'my-article prose' }, vnodes)
```

### 流式场景下显式维护缓存

```typescript
// 组件 setup 中
const propsCache = new Map()
watch(content, (c) => {
  vnodes.value = htmlToVnodes(md.render(c), { componentMap, propsCache })
})
// propsCache 跨 tick 保留 → JSON props 引用稳定，子组件不会因引用变化重建
```

### 不需要 Vue 组件，仅要安全 HTML

直接用 `useMarkdownParser().parse()` 拿 HTML 字符串就好 —— `htmlToVnodes` 的目的是**生成 VNode**，不是返回 HTML。
