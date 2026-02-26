# 介绍

`vue-markdown-stream` 是一个为 **AI 流式输出场景**设计的 Vue 3 库，能够将 Markdown 内容中通过 `markdown-it-container` 定义的 `:::` 容器块实时渲染为真实的 Vue 组件。

## 为什么需要它？

在接入 LLM 流式输出时，你通常会遇到以下需求：

- **逐字渲染**：每收到一个 token 就实时更新 UI
- **富文本支持**：代码块、表格、粗体等 Markdown 语法需要正确渲染
- **组件级扩展**：某些特殊内容（告警、卡片、图表）需要渲染为专门的 Vue 组件，而不只是普通 HTML

传统方案通常是直接 `v-html` 渲染，但这样就失去了 Vue 组件的能力（响应式、交互、样式隔离等）。

## 核心架构

```
流式文本 chunk
  ↓ autoCloseContainers()        补全未闭合 ::: 块（流式中间态处理）
  ↓ markdown-it + container      输出含 <vue-block> 占位元素的 HTML
  ↓ DOMParser                    HTML 字符串 → DOM 树
  ↓ domNodeToVNode()             递归转换：<vue-block> → h(Vue组件, props, slots)
  ↓ MarkdownRenderer             h('div.markdown-body', vnodes)
```

## 为什么不用 `compile()`？

Vue 的运行时编译（`compile()`）会：
- 需要引入 `@vue/compiler-dom`，包体积增加约 14KB（gzip）
- 每次流式更新都要重新编译整个模板，性能代价高昂
- 需要配置 `vue` alias 指向含 compiler 的完整版本

本库选择 **`DOMParser` + `h()` VNode 构建**，无额外依赖，渲染性能更优。

## 功能特性

- ✅ 流式打字机效果，支持任意速度的 chunk 追加
- ✅ `:::alert` 块 → `AlertBlock` 组件（4 种类型）
- ✅ `:::card` 块 → `DataCard` 组件（支持标题和 slot 内容）
- ✅ 未闭合块自动补全，中间态渲染始终合法
- ✅ 自定义块组件扩展（5 行代码注册）
- ✅ 完整 TypeScript 类型支持
- ✅ ESM + CJS 双格式输出
