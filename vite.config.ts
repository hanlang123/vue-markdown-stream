import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

const isLib = process.env['BUILD_MODE'] === 'lib'

export default defineConfig({
  plugins: [
    vue(),
    ...(isLib
      ? [
          dts({
            tsconfigPath: './tsconfig.app.json',
            include: [
              'src/index.ts',
              'src/chat.ts',
              'src/components/MarkdownRenderer.ts',
              'src/components/blocks',
              'src/components/chat',
              'src/composables',
              'src/core',
              'src/types',
            ],
          }),
        ]
      : []),
  ],
  ...(isLib
    ? {
        build: {
          lib: {
            entry: {
              index: resolve(__dirname, 'src/index.ts'),
              chat: resolve(__dirname, 'src/chat.ts'),
            },
            name: 'VueMarkdownStream',
            formats: ['es', 'cjs'],
            fileName: (format, entryName) =>
              entryName === 'index'
                ? `vue-markdown-stream.${format}.js`
                : `${entryName}.${format}.js`,
          },
          rollupOptions: {
            external: ['vue', 'markdown-it', 'markdown-it-container'],
            output: {
              globals: {
                vue: 'Vue',
                'markdown-it': 'MarkdownIt',
                'markdown-it-container': 'MarkdownItContainer',
              },
            },
          },
          sourcemap: true,
          copyPublicDir: false,
        },
      }
    : {}),
})
