import { defineComponent, h, type PropType, type VNode } from 'vue'
import { renderMarkdown } from '../composables/useMarkdownParser'
import { htmlToVnodes, type ComponentMap } from '../utils/htmlToVnodes'
import AlertBlock from './blocks/AlertBlock.vue'
import DataCard from './blocks/DataCard.vue'

const componentMap: ComponentMap = {
  AlertBlock,
  DataCard,
}

export default defineComponent({
  name: 'MarkdownRenderer',
  props: {
    content: {
      type: String as PropType<string>,
      default: '',
    },
  },
  setup(props) {
    return () => {
      const html = renderMarkdown(props.content)
      const vnodes = htmlToVnodes(html, componentMap)
      return h('div', { class: 'markdown-body' }, vnodes as VNode[])
    }
  },
})
