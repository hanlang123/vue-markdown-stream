# Props 校验

## `validateProps` <Badge type="tip" text="v2" />

校验并清洗从 `data-*` 属性提取的 props，防止 LLM 输出注入。

```typescript
import { validateProps, defaultSchemas } from '@krishanjinbo/vue-markdown-stream'

const safeProps = validateProps('ConfirmBlock', rawProps, defaultSchemas)
```

::: tip
通常不需要直接调用，`MarkdownRenderer` 在构建 VNode 时自动调用。可通过 `enableValidation` prop 关闭。
:::

## 安全机制

### 全局黑名单

以下属性**永远**不会从 LLM 输出传入组件：

```
onclick, onload, onerror, onmouseover, onfocus, onblur,
onsubmit, onchange, oninput, onkeydown, onkeyup, onkeypress,
href, src, action, formaction, srcdoc,
innerHTML, outerHTML, dangerouslySetInnerHTML,
style, is
```

### 组件白名单

每个组件只接受 schema 中声明的 props。未声明的 props 被丢弃。

## `defaultSchemas`

内置组件的默认 Schema 注册表：

```typescript
import { defaultSchemas } from '@krishanjinbo/vue-markdown-stream'
```

## `PropRule` 类型

```typescript
interface PropRule {
  type: 'string' | 'number' | 'boolean' | 'enum'
  required?: boolean
  default?: unknown
  enum?: string[]        // type 为 'enum' 时
  maxLength?: number     // type 为 'string' 时
  min?: number           // type 为 'number' 时
  max?: number           // type 为 'number' 时
}
```

## `ComponentPropsSchema` 类型

```typescript
interface ComponentPropsSchema {
  allowed: Record<string, PropRule>
  blocked?: string[]     // 额外黑名单
}
```

## `sanitizePayload`

清洗事件 payload，通过 JSON 序列化/反序列化递归移除函数、Symbol、循环引用：

```typescript
import { sanitizePayload } from '@krishanjinbo/vue-markdown-stream'

const safe = sanitizePayload(untrustedData)
```
