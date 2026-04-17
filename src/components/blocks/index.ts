export { default as AlertBlock } from './AlertBlock.vue'
export { default as DataCard } from './DataCard.vue'
export { default as ConfirmBlock } from './ConfirmBlock.vue'
export { default as SelectBlock } from './SelectBlock.vue'
export { default as FormBlock } from './FormBlock.vue'
export { default as ProgressBlock } from './ProgressBlock.vue'
export { default as DataTableBlock } from './DataTableBlock.vue'
export { default as ActionPills } from './ActionPills.vue'
export { default as MermaidBlock } from './MermaidBlock.vue'
export { default as ArtifactBlock } from './ArtifactBlock.vue'

import type { ComponentMap } from '../../types'
import AlertBlock from './AlertBlock.vue'
import DataCard from './DataCard.vue'
import ConfirmBlock from './ConfirmBlock.vue'
import SelectBlock from './SelectBlock.vue'
import FormBlock from './FormBlock.vue'
import ProgressBlock from './ProgressBlock.vue'
import DataTableBlock from './DataTableBlock.vue'
import ActionPills from './ActionPills.vue'
import MermaidBlock from './MermaidBlock.vue'
import ArtifactBlock from './ArtifactBlock.vue'

/**
 * 默认的内置组件注册表
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
  MermaidBlock,
  ArtifactBlock,
}
