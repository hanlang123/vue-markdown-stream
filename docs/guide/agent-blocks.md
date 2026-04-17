# Agent 交互组件

v2 内置了 6 个交互/展示组件，LLM 通过标准 Markdown `:::` 语法即可渲染。

另有 [Artifact 内容块](./artifact)，支持代码/HTML/SVG/文档等内容的独立展示面板。

## ConfirmBlock — 确认操作

```markdown
::: confirm action="delete_user" level=danger
确认要删除用户 **张三** 吗？此操作不可撤销。
:::
```

### 属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `action` | `string` | `''` | 操作标识，回传给 Agent |
| `level` | `'info' \| 'warning' \| 'danger'` | `'warning'` | 颜色主题 |
| `confirmText` | `string` | `'确认'` | 确认按钮文字 |
| `cancelText` | `string` | `'取消'` | 取消按钮文字 |

### 事件

- `confirm` — 用户点击确认，`data: { action, confirmed: true }`
- `cancel` — 用户点击取消，`data: { action, confirmed: false }`

---

## SelectBlock — 选择/消歧

```markdown
::: select mode=single columns=2
- **小米科技有限责任公司** | 91110108551385082Q
- **小米汽车科技有限公司** | 91110400MA7D6T4W01
- **广东小米科技有限责任公司** | 91440101MA59A5P606
:::
```

### 属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `mode` | `'single' \| 'multiple'` | `'single'` | 选择模式 |
| `columns` | `number` | `2` | 网格列数（1-4） |
| `maxSelect` | `number` | `1` | 多选最大数量 |

### 事件

- `select` — `data: { selectedIndices, selectedOptions }`

---

## FormBlock — 动态表单

```markdown
::: form id="feedback" submitText="提交反馈"
- rating: select ["很满意", "一般", "不满意"]
- comment: textarea "请输入反馈..."
- urgent: checkbox "紧急问题"
:::
```

### 属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `id` | `string` | `''` | 表单标识 |
| `submitText` | `string` | `'提交'` | 提交按钮文字 |
| `layout` | `'vertical' \| 'horizontal'` | `'vertical'` | 布局方向 |

### 字段语法

```
- fieldName: text "占位提示"
- fieldName: textarea "占位提示"
- fieldName: select ["选项1", "选项2", "选项3"]
- fieldName: checkbox "标签文字"
```

### 事件

- `submit` — `data: { formId, values: { ... } }`

---

## ProgressBlock — 进度展示

```markdown
::: progress value=73 max=100 status=active
正在导入数据... 已处理 73/100 条
:::
```

### 属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `value` | `number` | `0` | 当前进度值 |
| `max` | `number` | `100` | 最大值 |
| `status` | `'active' \| 'success' \| 'error'` | `'active'` | 颜色状态 |

---

## DataTableBlock — 数据表格

```markdown
::: datatable sortable filterable
| 姓名 | 部门 | 状态 |
|------|------|------|
| 张三 | 研发 | 在线 |
| 李四 | 产品 | 离线 |
:::
```

### 属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `sortable` | `boolean` | `false` | 是否可点击表头排序 |
| `filterable` | `boolean` | `false` | 是否显示搜索过滤框 |
| `pageSize` | `number` | `10` | 每页行数 |

---

## ActionPills — 快捷操作气泡

```markdown
::: actions
- 查看处理进度
- 生成报告
- 导出数据
:::
```

### 属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `layout` | `'inline' \| 'wrap'` | `'inline'` | 排列方式 |

### 事件

- `pill_click` — `data: { text, index }`

---

## ArtifactBlock — 内容产物面板

类似 Claude Code 的 Artifact 机制，将代码、HTML、SVG、文档等独立内容渲染为可交互的面板。

```markdown
::: artifact type="code" lang="typescript" title="示例代码"
const greeting = "Hello, Artifact!"
console.log(greeting)
:::
```

### 属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `type` | `'code' \| 'html' \| 'svg' \| 'document' \| 'mermaid' \| 'text'` | `'code'` | 内容类型 |
| `lang` | `string` | `''` | 代码语言（`type="code"` 时有效） |
| `title` | `string` | `''` | 面板标题 |

### 事件

- `copy` — 用户复制内容，`data: { type, title }`
- `download` — 用户下载文件，`data: { type, title, filename }`
- `toggle` — 用户切换折叠，`data: { type, title, collapsed }`

详见 [Artifact 内容块](./artifact) 完整文档。
