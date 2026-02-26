---
layout: home

hero:
  name: "vue-markdown-stream"
  text: "流式 Markdown + Vue 组件块"
  tagline: "在 AI 流式输出中，将 ::: 容器块实时渲染为真实 Vue 组件"
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
  - icon: ⚡
    title: 流式打字机渲染
    details: "逐字追加输出，autoCloseContainers 自动补全未闭合 ::: 块，确保每一帧都是合法 Markdown"
  - icon: 🧩
    title: Vue 组件块
    details: ":::alert 和 :::card 块被渲染为真实 Vue 组件，支持响应式 props 和 slot 内容"
  - icon: 🔌
    title: 完全可扩展
    details: ComponentMap 机制，5 行代码注册任意自定义块组件，传递任意 data-* props
  - icon: 🪶
    title: 轻量无运行时编译
    details: "基于 DOMParser + h() VNode 树，不引入 Vue compiler，bundle 增量仅约 40KB"
---
