# 介绍

`vue-markdown-stream` 是一个为 **AI Agent 场景**设计的 Vue 3 库。它将 Markdown 内容中的 `:::` 容器块实时渲染为真实 Vue 组件，并支持组件向 Agent 回传用户交互事件。

## v2 新增能力

| 能力 | v1 | v2 |
|------|----|----|
| 流式打字机渲染 | ✅ | ✅ |
| alert / card 组件块 | ✅ | ✅ |
| 自定义块扩展 | 修改源码 | **Props 传入 componentMap** |
| Confirm / Select / Form / Progress / DataTable / Actions | ❌ | ✅ |
| Artifact 内容面板（代码/HTML/SVG/文档） | ❌ | ✅ |
| 组件事件回传 Agent | ❌ | ✅ **AgentEventBus** |
| Props 安全校验 | ❌ | ✅ **白名单 + 黑名单** |
| `@agent:action` 事件 | ❌ | ✅ |

## 核心架构

```
流式文本 chunk
  → autoCloseContainers()       补全未闭合 ::: 块（增强版）
  → markdown-it + container     输出含 <vue-block> 的 HTML
  → DOMParser                   HTML → DOM 树
  → PropValidator               Props 白名单校验 + 清洗
  → h() VNode 构建              <vue-block> → Vue 组件 VNode + 事件绑定
  → AgentEventBus               组件事件 → 宿主应用回调
  → MarkdownRenderer            渲染输出 + @agent:action 事件
```

## 为什么不用 `compile()`？

Vue 的运行时编译（`compile()`）会：
- 需要引入 `@vue/compiler-dom`，包体积增加约 14KB（gzip）
- 每次流式更新都要重新编译整个模板，性能代价高昂
- 需要配置 `vue` alias 指向含 compiler 的完整版本

本库选择 **`DOMParser` + `h()` VNode 构建**，无额外依赖，渲染性能更优。

## 功能特性

- ✅ 流式打字机效果，支持任意速度的 chunk 追加
- ✅ `:::alert` / `:::card` 渲染为 Vue 组件（向后兼容 v1）
- ✅ `:::confirm` / `:::select` / `:::form` / `:::progress` / `:::datatable` / `:::actions` 交互组件
- ✅ `:::artifact` 内容面板 — 类似 Claude Code Artifact，支持代码/HTML/SVG/文档展示、复制、下载
- ✅ `AgentEventBus` 事件系统，组件交互 → 宿主应用 → Agent
- ✅ `PropValidator` Props 白名单校验 + 值清洗 + 类型转换
- ✅ 通过 props 传入自定义 `componentMap` 和 `propsSchemas`
- ✅ 未闭合块自动补全，中间态渲染始终合法
- ✅ 完整 TypeScript 类型支持
- ✅ ESM + CJS 双格式输出，内置组件支持 tree-shaking
