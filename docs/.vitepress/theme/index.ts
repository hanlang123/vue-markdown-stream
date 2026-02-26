import DefaultTheme from 'vitepress/theme'
import { defineAsyncComponent, type App } from 'vue'
import type { Theme } from 'vitepress'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }: { app: App }) {
    app.component(
      'StreamDemo',
      defineAsyncComponent(() => import('../components/StreamDemo.vue')),
    )
  },
} satisfies Theme
