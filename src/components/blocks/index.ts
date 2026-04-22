import type { ComponentMap } from '../../types'
import { defineBlock, type BlockDefinition } from '../../core/blockRegistry'
import { defaultSchemas } from '../../core/propValidator'
import AlertBlock from './AlertBlock.vue'
import DataCard from './DataCard.vue'
import ConfirmBlock from './ConfirmBlock.vue'
import SelectBlock from './SelectBlock.vue'
import FormBlock from './FormBlock.vue'
import ProgressBlock from './ProgressBlock.vue'
import DataTableBlock from './DataTableBlock.vue'
import ActionPills from './ActionPills.vue'
import ArtifactBlock from './ArtifactBlock.vue'

export { default as AlertBlock } from './AlertBlock.vue'
export { default as DataCard } from './DataCard.vue'
export { default as ConfirmBlock } from './ConfirmBlock.vue'
export { default as SelectBlock } from './SelectBlock.vue'
export { default as FormBlock } from './FormBlock.vue'
export { default as ProgressBlock } from './ProgressBlock.vue'
export { default as DataTableBlock } from './DataTableBlock.vue'
export { default as ActionPills } from './ActionPills.vue'
export { default as ArtifactBlock } from './ArtifactBlock.vue'

/**
 * 默认的内置组件注册表（保持向后兼容导出）
 */
export const builtinComponentMap: ComponentMap = {
  AlertBlock,
  DataCard,
  ConfirmBlock,
  SelectBlock,
  FormBlock,
  ProgressBlock,
  DataTableBlock,
  ActionPills,
  ArtifactBlock,
}

/**
 * 返回一组内置 BlockDefinition
 *
 * 每个块使用 `defineBlock` 统一注册，保证"内置块 = 外置块"同构。
 */
export function createBuiltinBlocks(): BlockDefinition[] {
  return [
    defineBlock({
      name: 'alert',
      component: AlertBlock,
      componentName: 'AlertBlock',
      parseInfo: (rest) => {
        const type = rest.trim() || 'info'
        return { type }
      },
      schema: defaultSchemas['AlertBlock'],
      docs: {
        description: '告警提示块（info/success/warning/error）',
        example: '::: alert warning\n注意事项\n:::',
        fields: [{ name: 'type', type: 'enum', enum: ['info', 'success', 'warning', 'error'] }],
      },
    }),
    defineBlock({
      name: 'card',
      component: DataCard,
      componentName: 'DataCard',
      parseInfo: 'title',
      schema: defaultSchemas['DataCard'],
      docs: {
        description: '带标题的数据卡片',
        example: '::: card 技术栈对比\n内容...\n:::',
      },
    }),
    defineBlock({
      name: 'confirm',
      component: ConfirmBlock,
      componentName: 'ConfirmBlock',
      parseInfo: 'attrs',
      schema: defaultSchemas['ConfirmBlock'],
      docs: {
        description: '确认/取消操作块',
        example: '::: confirm action="delete" level=danger\n确认删除？\n:::',
        fields: [
          { name: 'action', type: 'string' },
          { name: 'level', type: 'enum', enum: ['info', 'warning', 'danger'] },
        ],
      },
    }),
    defineBlock({
      name: 'select',
      component: SelectBlock,
      componentName: 'SelectBlock',
      parseInfo: 'attrs',
      schema: defaultSchemas['SelectBlock'],
      docs: {
        description: '单选/多选块',
        example: '::: select mode=single\n- 选项 A\n- 选项 B\n:::',
      },
    }),
    defineBlock({
      name: 'form',
      component: FormBlock,
      componentName: 'FormBlock',
      parseInfo: 'attrs',
      schema: defaultSchemas['FormBlock'],
      docs: { description: '表单块', example: '::: form id=signup\n...\n:::' },
    }),
    defineBlock({
      name: 'progress',
      component: ProgressBlock,
      componentName: 'ProgressBlock',
      parseInfo: 'attrs',
      schema: defaultSchemas['ProgressBlock'],
      docs: {
        description: '进度条',
        example: '::: progress value=73 max=100 status=active\n处理中...\n:::',
      },
    }),
    defineBlock({
      name: 'datatable',
      component: DataTableBlock,
      componentName: 'DataTableBlock',
      parseInfo: 'attrs',
      schema: defaultSchemas['DataTableBlock'],
      docs: { description: '数据表', example: '::: datatable sortable\n| a | b |\n|---|---|\n:::' },
    }),
    defineBlock({
      name: 'actions',
      component: ActionPills,
      componentName: 'ActionPills',
      parseInfo: 'attrs',
      schema: defaultSchemas['ActionPills'],
      docs: {
        description: '快捷操作按钮列表',
        example: '::: actions\n- 查看详情\n- 导出\n:::',
      },
    }),
    defineBlock({
      name: 'artifact',
      component: ArtifactBlock,
      componentName: 'ArtifactBlock',
      parseInfo: 'attrs',
      schema: defaultSchemas['ArtifactBlock'],
      docs: {
        description: 'Artifact 内容块（代码/HTML/SVG/Mermaid/文档）',
        example: '::: artifact type="code" lang="python"\nprint(1)\n:::',
        fields: [
          {
            name: 'type',
            type: 'enum',
            enum: ['code', 'html', 'svg', 'document', 'mermaid', 'text'],
          },
        ],
      },
    }),
  ]
}
