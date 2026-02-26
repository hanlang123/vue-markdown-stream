import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'vue-markdown-stream',
  description: '流式 Markdown 渲染 + Vue 组件块，基于 markdown-it-container',
  base: '/vue-markdown-stream/',
  lang: 'zh-CN',

  head: [
    ['meta', { name: 'theme-color', content: '#6366f1' }],
    ['meta', { property: 'og:title', content: 'vue-markdown-stream' }],
    ['meta', { property: 'og:description', content: '流式 Markdown 渲染 + Vue 组件块' }],
  ],

  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/introduction' },
      { text: 'API', link: '/api/markdown-renderer' },
      { text: '演示', link: '/demo' },
      {
        text: 'v1.0.0',
        items: [
          { text: 'Changelog', link: 'https://github.com/hanlang123/vue-markdown-stream/releases' },
          { text: 'npm', link: 'https://www.npmjs.com/package/vue-markdown-stream' },
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
