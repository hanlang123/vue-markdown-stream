import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'vue-markdown-stream',
  description: 'Agent UI Protocol — LLM 可控的流式 Markdown 渲染 + Vue 交互组件协议',
  base: '/vue-markdown-stream/',
  lang: 'zh-CN',

  head: [
    ['meta', { name: 'theme-color', content: '#6366f1' }],
    ['meta', { property: 'og:title', content: 'vue-markdown-stream' }],
    ['meta', { property: 'og:description', content: 'Agent UI Protocol — 流式 Markdown + Vue 交互组件' }],
  ],

  vite: {
    ssr: {
      noExternal: ['markdown-it', 'markdown-it-container'],
    },
  },

  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/introduction' },
      { text: 'API', link: '/api/markdown-renderer' },
      { text: '演示', link: '/demo' },
      {
        text: 'v2.0.0',
        items: [
          { text: 'Changelog', link: 'https://github.com/hanlang123/vue-markdown-stream/releases' },
          { text: 'npm', link: 'https://www.npmjs.com/package/@krishanjinbo/vue-markdown-stream' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '介绍', link: '/guide/introduction' },
            { text: '快速上手', link: '/guide/getting-started' },
            { text: '流式输出', link: '/guide/streaming' },
            { text: '自定义块', link: '/guide/custom-blocks' },
            { text: 'Agent 交互组件', link: '/guide/agent-blocks' },
            { text: '事件系统', link: '/guide/events' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: 'MarkdownRenderer', link: '/api/markdown-renderer' },
            { text: 'Composables', link: '/api/composables' },
            { text: '工具函数', link: '/api/utils' },
            { text: '事件总线', link: '/api/event-bus' },
            { text: 'Props 校验', link: '/api/prop-validator' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/hanlang123/vue-markdown-stream' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 hanlang123',
    },

    search: {
      provider: 'local',
    },
  },
})
