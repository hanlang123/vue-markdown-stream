# 在线演示

下方是 `vue-markdown-stream` v2 的完整功能演示。点击「开始演示」观看流式输出效果——Markdown 内容会逐字渲染，`:::alert`、`:::card`、`:::confirm`、`:::progress`、`:::datatable`、`:::actions` 等块会在出现时实时挂载为 Vue 组件。

<StreamDemo />

## 示例语法

### Alert 块

```markdown
::: alert info
信息提示内容，支持 **Markdown** 语法。
:::

::: alert warning
注意：这是一条警告信息。
:::
```

### Card 块

```markdown
::: card 技术栈对比
| 方案 | 性能 | 体积 |
|------|------|------|
| h() + DOMParser | ✅ 优秀 | ✅ 轻量 |
:::
```

### Confirm 块（v2 新增）

```markdown
::: confirm action="delete_user" level=danger
确认要删除用户 **张三** 吗？此操作不可撤销。
:::
```

### Progress 块（v2 新增）

```markdown
::: progress value=73 max=100 status=active
正在导入数据... 已处理 73/100 条
:::
```

### DataTable 块（v2 新增）

```markdown
::: datatable sortable filterable
| 姓名 | 部门 | 状态 |
|------|------|------|
| 张三 | 研发 | 在线 |
| 李四 | 产品 | 离线 |
:::
```

### Actions 块（v2 新增）

```markdown
::: actions
- 查看处理进度
- 生成报告
- 导出数据
:::
```
