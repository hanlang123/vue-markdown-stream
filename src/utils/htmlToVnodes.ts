import { h, type Component, type VNode } from 'vue'

export type ComponentMap = Record<string, Component>

/**
 * 递归将 DOM 节点转换为 VNode
 * 遇到 <vue-block data-component="Xxx"> 时挂载对应 Vue 组件
 */
function domNodeToVNode(node: Node, componentMap: ComponentMap): VNode | string | null {
  // 文本节点
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || ''
  }

  // 注释节点忽略
  if (node.nodeType === Node.COMMENT_NODE) {
    return null
  }

  const el = node as Element
  const tag = el.tagName?.toLowerCase()

  // Vue 组件占位块
  if (tag === 'vue-block') {
    const compName = el.getAttribute('data-component')
    if (!compName || !componentMap[compName]) {
      // 找不到组件时降级渲染内部 HTML
      return h('div', { innerHTML: el.innerHTML })
    }

    const Comp = componentMap[compName]

    // 收集 data-* 作为 props（排除 data-component）
    const props: Record<string, string> = {}
    for (const attr of Array.from(el.attributes)) {
      if (attr.name !== 'data-component' && attr.name.startsWith('data-')) {
        const key = attr.name.slice(5) // 去掉 'data-'
        props[key] = attr.value
      }
    }

    // 递归转换子节点作为 default slot
    const children = domNodesToVNodes(el.childNodes, componentMap)
    return h(Comp, props, { default: () => children })
  }

  // 普通 HTML 元素：递归处理子节点
  const children = domNodesToVNodes(el.childNodes, componentMap)

  // 收集标准属性
  const attrs: Record<string, string> = {}
  for (const attr of Array.from(el.attributes)) {
    attrs[attr.name] = attr.value
  }

  return h(tag, attrs, children)
}

function domNodesToVNodes(nodes: NodeList, componentMap: ComponentMap): (VNode | string)[] {
  const result: (VNode | string)[] = []
  for (const node of Array.from(nodes)) {
    const vnode = domNodeToVNode(node, componentMap)
    if (vnode !== null) {
      result.push(vnode)
    }
  }
  return result
}

/**
 * 将 markdown-it 输出的 HTML 字符串转换为 VNode 数组
 * 其中 <vue-block> 自定义标签会被替换为真实 Vue 组件
 */
export function htmlToVnodes(html: string, componentMap: ComponentMap): (VNode | string)[] {
  if (!html) return []

  const parser = new DOMParser()
  // 包裹在 div 中确保能解析 fragment
  const doc = parser.parseFromString(`<div id="__root">${html}</div>`, 'text/html')
  const root = doc.getElementById('__root')
  if (!root) return []

  return domNodesToVNodes(root.childNodes, componentMap)
}
