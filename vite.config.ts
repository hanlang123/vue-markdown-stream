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
              'src/components/MarkdownRenderer.ts',
              'src/components/blocks',
              'src/composables/useMarkdownParser.ts',
              'src/composables/useStreamingText.ts',
              'src/utils',
            ],
          }),
        ]
      : []),
  ],
  ...(isLib
    ? {
        build: {
          lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'VueMarkdownStream',
            fileName: (format) => `vue-markdown-stream.${format}.js`,
            formats: ['es', 'cjs'],
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
