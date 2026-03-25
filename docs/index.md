---
layout: home

hero:
  name: "vue-markdown-stream"
  text: "Agent UI Protocol"
  tagline: "LLM 可控的流式 Markdown 渲染 + Vue 交互组件协议"
  actions:
    - theme: brand
      text: 快速上手
      link: /guide/getting-started
    - theme: alt
      text: 在线演示
      link: /demo
    - theme: alt
      text: GitHub
      link: https://github.com/hanlang123/vue-markdown-stream

features:
  - icon: "\u26A1"
    title: 流式打字机渲染
    details: "逐字追加输出，autoCloseContainers 自动补全未闭合 ::: 块，确保每一帧都是合法 Markdown"
  - icon: "\uD83E\uDDE9"
    title: Agent 交互组件
    details: "内置 Confirm / Select / Form / Progress / DataTable / Actions 等组件，LLM 用 Markdown 语法即可渲染"
  - icon: "\uD83D\uDD14"
    title: 事件回传
    details: "AgentEventBus 将用户交互（确认、选择、提交）回传给宿主应用，闭环 Agent 交互流程"
  - icon: "\uD83D\uDD12"
    title: Props 安全校验
    details: "白名单校验 + 全局黑名单 + 类型转换，防止 LLM 输出的 XSS / 注入攻击"
---
