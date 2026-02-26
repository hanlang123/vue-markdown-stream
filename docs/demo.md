# 在线演示

下方是 `vue-markdown-stream` 的完整功能演示。点击「开始演示」观看流式输出效果——Markdown 内容会逐字渲染，`:::alert` 和 `:::card` 块会在出现时实时挂载为 Vue 组件。

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

::: alert success
操作成功！
:::

::: alert error
发生错误，请检查配置。
:::
```

### Card 块

```markdown
::: card 技术栈对比

| 方案 | 性能 | 体积 |
|------|------|------|
| h() + DOMParser | ✅ 优秀 | ✅ 轻量 |
| compile() | ❌ 每次重编译 | ❌ +14KB |

:::
```

### 混合使用

```markdown
# 分析报告

数据处理完成，以下是结果：

::: alert success
所有 **1,024** 条记录处理成功，耗时 `1.2s`。
:::

::: card 统计摘要

| 指标 | 数值 |
|------|------|
| 总记录数 | 1,024 |
| 成功 | 1,021 |
| 跳过 | 3 |

:::
```
