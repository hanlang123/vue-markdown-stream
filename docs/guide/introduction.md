# 介绍

`vue-markdown-stream` 是一个为 **AI Agent 场景**设计的 Vue 3 库。它将 Markdown 内容中的 `:::` 容器块实时渲染为真实 Vue 组件，并支持组件向 Agent 回传用户交互事件。

## 版本能力矩阵

| 能力 | v1 | v2 | v3 |
|------|----|----|----|
| 流式打字机渲染 | ✅ | ✅ | ✅ |
| 内置 alert / card | ✅ | ✅ | ✅ |
| Confirm / Select / Form / Progress / DataTable / Actions | ❌ | ✅ | ✅ |
| Artifact 内容面板 | ❌ | ✅ | ✅ |
| Props 安全校验 + `AgentEventBus` | ❌ | ✅ | ✅ |
| 自定义块扩展 | 修改源码 | Props 传 `componentMap` | **`defineBlock` 一行注册** |
| 统一块注册中心 `BlockRegistry` | ❌ | ❌ | ✅ |
| `MarkdownRenderer` 内置 `streaming` / `cursor` | ❌ | ❌ | ✅ |
| 真实流式通信 composable `useAgentStream` | ❌ | ❌ | ✅（SSE / NDJSON / 中断 / 续播） |
| 工厂式 API `createMarkdownStream` | ❌ | ❌ | ✅ |
| LLM prompt 文档生成器 `generateBlockPromptDocs` | ❌ | ❌ | ✅ |
| `/chat` 子包：ChatMessageList / ChatInput / AgentStatusTimeline | ❌ | ❌ | ✅ |
| `htmlToVnodes` 独立导出（低阶 API） | ❌ | ❌ | ✅ |

## v3 的一句话总结

> 从「Markdown 流式渲染器」升级为**开箱即用的 Agent/Chat UI 工具集**。10 行业务代码即可搭出带中断/时间轴/自定义块的 AI 聊天页 —— 详见 [从 0 到聊天应用](./chat-quickstart)。

## 核心架构

```
流式文本 chunk
  → autoCloseContainers()       补全未闭合 ::: 块
  → markdown-it + container     按 BlockRegistry 渲染为含 <vue-block> 的 HTML
  → htmlToVnodes()              HTML → VNode；Props 校验 + 剥离危险属性
                                 stableKey + propsCache 保证流式引用稳定
  → AgentEventBus               组件事件 → 宿主 → Agent
  → MarkdownRenderer            最终渲染 + @agent:action
```

## 为什么不用 `compile()`？

Vue 运行时编译（`compile()`）会：
- 引入 `@vue/compiler-dom`，包体积 +14KB（gzip）
- 每次流式更新都要重新编译整个模板，性能代价高
- 需要配置 `vue` alias 指向含 compiler 的完整版本

本库选择 **`DOMParser` + `h()` VNode 构建**，无额外依赖，渲染性能更优，且 SSR 友好（含 fallback 解析器）。

## 功能特性

- ✅ 流式打字机效果，支持任意速度的 chunk 追加，`streaming` prop 一键启用 rAF 节流
- ✅ 9 个内置块：`alert` / `card` / `confirm` / `select` / `form` / `progress` / `datatable` / `actions` / `artifact`
- ✅ `defineBlock` 一行注册自定义块，支持 `attrs` / `json` / `title` / 自定义函数 4 种 info-string 策略
- ✅ `useAgentStream` 真实流式通信 + 状态时间轴 + 中断 / 续播
- ✅ `AgentEventBus` 事件系统，组件交互 → 宿主应用 → Agent
- ✅ `PropValidator` Props 白名单 + 黑名单 + 危险 URL 协议剥离（XSS 防御）
- ✅ `generateBlockPromptDocs` 自动产出 LLM system prompt 片段
- ✅ `/chat` 子包：`ChatMessageList` / `ChatInput` / `AgentStatusTimeline`，可选接入
- ✅ 未闭合块自动补全，中间态渲染始终合法
- ✅ 完整 TypeScript 类型支持
- ✅ ESM + CJS 双格式，tree-shaking 友好
