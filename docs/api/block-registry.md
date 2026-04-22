# Block Registry <Badge type="tip" text="v3" />

`defineBlock` + `BlockRegistry` 是 v3 引入的**统一块注册机制**。内置块与用户块共用同一份元数据结构，调用方只需声明 1 次，即可获得：markdown-it 容器绑定、HTML→VNode 映射、Props 校验、LLM prompt 文档生成。

## 设计动机

v2 添加一个自定义块需要改 6 处（markdown-it container、componentMap、propsSchemas、info-string 解析、docs、示例）。v3 把这些全部收敛到一个 `BlockDefinition`：

```typescript
import { defineBlock } from '@krishanjinbo/vue-markdown-stream'
import JobCardBlock from './JobCardBlock.vue'

const JobCard = defineBlock({
  name: 'job-card',
  component: JobCardBlock,
  parseInfo: 'json',
})
```

## `defineBlock(def)`

类型安全的便捷工厂，直接返回入参（用于类型推导 + IDE 自动补全）。

### `BlockDefinition`

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 块名，即 `:::<name>` 语法中的关键字 |
| `component` | `Component` | 对应渲染的 Vue 组件 |
| `componentName` | `string` | 在 componentMap 中的注册名。默认从 `name` 推导（`job-card → JobCardBlock`） |
| `parseInfo` | `ParseInfoStrategy` | info-string 解析策略，见下表。默认 `'attrs'` |
| `schema` | `ComponentPropsSchema` | Props 安全校验 Schema |
| `override` | `boolean` | 是否覆盖同名块。默认 `false`，防止意外覆盖内置块 |
| `docs` | `{ description?, example?, fields? }` | 用于 LLM system prompt 生成 |

### `ParseInfoStrategy`

`:::name <rest>` 中 `<rest>` 的解析方式：

| 策略 | 示例 | 产出 |
|------|------|------|
| `'attrs'`（默认） | `:::confirm action=delete level=danger` | `{ action: 'delete', level: 'danger' }` |
| `'json'` | `:::job-card {"title":"前端"}` | `{ __props: { title: '前端' } }` → 自动进 `data-props` |
| `'title'` | `:::card 技术栈对比` | `{ title: '技术栈对比' }` |
| `(rest) => Record<string, unknown>` | 自定义函数 | 返回对象；若含 `__props`（对象）会被当作 JSON payload 注入 `data-props` |

### `docs` 元信息

用于 [`generateBlockPromptDocs`](#generateblockpromptdocs) 自动生成 LLM system prompt 片段：

```typescript
defineBlock({
  name: 'confirm',
  component: ConfirmBlock,
  parseInfo: 'attrs',
  docs: {
    description: '确认/取消操作块',
    example: '::: confirm action="delete" level=danger\n确认删除？\n:::',
    fields: [
      { name: 'action', type: 'string' },
      { name: 'level', type: 'enum', enum: ['info', 'warning', 'danger'] },
    ],
  },
})
```

## `createBlockRegistry()`

创建一个块注册中心。通常**无需直接调用** —— `useMarkdownParser` / `createMarkdownStream` 内部会自动管理；仅在你需要在运行时动态增删块时用到。

```typescript
import { createBlockRegistry, defineBlock } from '@krishanjinbo/vue-markdown-stream'

const registry = createBlockRegistry()

registry.register(defineBlock({ name: 'job-card', component: JobCard, parseInfo: 'json' }))
registry.has('job-card')  // true
registry.all()            // BlockDefinition[]
registry.remove('job-card')
```

### `BlockRegistry` 方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `register` | `(def: BlockDefinition) => void` | 注册。重名需 `override: true`，否则 warn 并跳过 |
| `registerMany` | `(defs: BlockDefinition[]) => void` | 批量注册 |
| `get` | `(name: string) => BlockDefinition \| undefined` | 取出 |
| `has` | `(name: string) => boolean` | 是否存在 |
| `all` | `() => BlockDefinition[]` | 全部 |
| `remove` | `(name: string) => boolean` | 删除 |

## 工具函数

### `parseAttrString(attrStr)`

解析 `key=value` / `key="value"` / `booleanFlag` 形式的属性串。内部含 **ReDoS 防御**：限制输入长度 10K 且使用非重叠字符类正则。

```typescript
parseAttrString('action="delete" level=danger quiet')
// { action: 'delete', level: 'danger', quiet: 'true' }
```

### `attrsToDataHtml(attrs)`

把 attrs 对象转成 markdown-it 可注入的 HTML 属性字符串。对象型 `__props` 会被序列化 + `encodeURIComponent` 写入 `data-props`；其它字段走 `data-<kebab>`。

### `applyParseInfo(strategy, rawInfoAfterName)`

应用 `ParseInfoStrategy` 解析 rest。所有策略都在 **流式过程中非法 JSON 静默忽略**，保证中间态不崩。

### `defaultComponentName(blockName)`

将 `job-card` / `job_card` 转为 `JobCardBlock`（默认组件名生成规则）。

### 常量

```typescript
export const JSON_PAYLOAD_KEY = '__props'  // parseInfo 'json' 注入的字段名
```

## `generateBlockPromptDocs(blocks, opts?)` {#generateblockpromptdocs}

从一组 `BlockDefinition` 生成可直接塞进 LLM system prompt 的 Markdown 文档。

```typescript
import { generateBlockPromptDocs, useMarkdownParser } from '@krishanjinbo/vue-markdown-stream'

const { registry } = useMarkdownParser({ blocks: [...] })
const systemPrompt = generateBlockPromptDocs(registry.all(), {
  title: 'Available UI Blocks',
  intro: '你可以在 markdown 中使用以下容器块回复用户：',
})

// 产出（每个 block 一段）：
// ## `:::confirm`
// 确认/取消操作块
// **Params style**: `attrs`
// **Fields**:
// - `action`: string
// - `level`: enum (info | warning | danger)
// **Example**:
// ```markdown
// ::: confirm action="delete" level=danger
// 确认删除？
// :::
// ```
```

## 与 `MarkdownRenderer` 的关系

```typescript
// 方式 A：props 临时传入
<MarkdownRenderer :content="c" :blocks="blocks" />

// 方式 B：useMarkdownParser 直接获得 registry
const { parse, registry } = useMarkdownParser({ blocks })

// 方式 C：工厂式，一次配置全局复用
const { MarkdownRenderer, registry } = createMarkdownStream({ blocks })
```

所有路径最终都走同一个 `blockRegistry`，行为完全一致。
