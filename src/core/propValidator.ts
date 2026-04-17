/**
 * 单个 prop 的校验规则
 */
export interface PropRule {
  type: 'string' | 'number' | 'boolean' | 'enum'
  required?: boolean
  default?: unknown
  enum?: string[]            // type 为 'enum' 时的允许值列表
  maxLength?: number         // type 为 'string' 时的最大长度
  min?: number               // type 为 'number' 时的最小值
  max?: number               // type 为 'number' 时的最大值
}

/**
 * 组件的 Props Schema 定义
 */
export interface ComponentPropsSchema {
  /** 允许的 props 白名单 */
  allowed: Record<string, PropRule>
  /** 全局黑名单（会覆盖 allowed 中同名属性） */
  blocked?: string[]
}

/**
 * 全局默认黑名单 — 这些属性绝不允许从 LLM 输出传入组件
 */
const GLOBAL_BLOCKED_PROPS = [
  'onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur',
  'onsubmit', 'onchange', 'oninput', 'onkeydown', 'onkeyup', 'onkeypress',
  'href', 'src', 'action', 'formaction', 'srcdoc',
  'innerHTML', 'outerHTML', 'dangerouslySetInnerHTML',
  'style',  // 防止通过 style 注入
  'is',     // 防止动态组件注入
]

/**
 * 默认的内置组件 Schema 注册表
 */
export const defaultSchemas: Record<string, ComponentPropsSchema> = {
  ConfirmBlock: {
    allowed: {
      action: { type: 'string', required: true, maxLength: 100 },
      level: { type: 'enum', enum: ['info', 'warning', 'danger'], default: 'warning' },
      confirmText: { type: 'string', default: '确认', maxLength: 20 },
      cancelText: { type: 'string', default: '取消', maxLength: 20 },
    },
  },
  SelectBlock: {
    allowed: {
      mode: { type: 'enum', enum: ['single', 'multiple'], default: 'single' },
      columns: { type: 'number', default: 2, min: 1, max: 4 },
      maxSelect: { type: 'number', default: 1, min: 1, max: 20 },
    },
  },
  FormBlock: {
    allowed: {
      id: { type: 'string', required: true, maxLength: 50 },
      submitText: { type: 'string', default: '提交', maxLength: 20 },
      layout: { type: 'enum', enum: ['vertical', 'horizontal'], default: 'vertical' },
    },
  },
  ProgressBlock: {
    allowed: {
      value: { type: 'number', required: true, min: 0, max: 100 },
      max: { type: 'number', default: 100, min: 1 },
      label: { type: 'string', maxLength: 100 },
      status: { type: 'enum', enum: ['active', 'success', 'error'], default: 'active' },
    },
  },
  DataTableBlock: {
    allowed: {
      sortable: { type: 'boolean', default: false },
      filterable: { type: 'boolean', default: false },
      pageSize: { type: 'number', default: 10, min: 5, max: 100 },
    },
  },
  ActionPills: {
    allowed: {
      layout: { type: 'enum', enum: ['inline', 'wrap'], default: 'inline' },
    },
  },
  // AlertBlock 和 DataCard 保持兼容，不加校验限制
  AlertBlock: { allowed: { type: { type: 'enum', enum: ['info', 'success', 'warning', 'error'], default: 'info' } } },
  DataCard: { allowed: { title: { type: 'string', maxLength: 100 } } },
  // MermaidBlock: code 属性白名单
  MermaidBlock: {
    allowed: {
      code: { type: 'string', maxLength: 50000 },
    },
  },
}

/**
 * 校验并清洗从 data-* 属性提取的 props
 *
 * @param componentName - 组件名称
 * @param rawProps - 从 data-* 提取的原始 props（全部为 string 类型）
 * @param schemas - Schema 注册表（可自定义扩展）
 * @returns 校验通过的 props 对象
 */
export function validateProps(
  componentName: string,
  rawProps: Record<string, string>,
  schemas: Record<string, ComponentPropsSchema> = defaultSchemas,
): Record<string, unknown> {
  const schema = schemas[componentName]
  const result: Record<string, unknown> = {}

  // 无 schema 的组件：只做全局黑名单过滤，props 原样透传（向后兼容）
  if (!schema) {
    for (const [key, value] of Object.entries(rawProps)) {
      if (!GLOBAL_BLOCKED_PROPS.includes(key.toLowerCase())) {
        result[key] = value
      }
    }
    return result
  }

  const blocked = new Set([
    ...GLOBAL_BLOCKED_PROPS,
    ...(schema.blocked || []),
  ])

  // 1. 过滤黑名单
  const filtered: Record<string, string> = {}
  for (const [key, value] of Object.entries(rawProps)) {
    if (!blocked.has(key.toLowerCase())) {
      filtered[key] = value
    }
  }

  // 2. 按 schema 校验 + 类型转换
  for (const [propName, rule] of Object.entries(schema.allowed)) {
    const rawValue = filtered[propName]

    if (rawValue === undefined || rawValue === '') {
      if (rule.required) {
        console.warn(`[PropValidator] Missing required prop "${propName}" for ${componentName}`)
      }
      if (rule.default !== undefined) {
        result[propName] = rule.default
      }
      continue
    }

    // 类型转换 + 校验
    switch (rule.type) {
      case 'string': {
        let strVal = String(rawValue)
        if (rule.maxLength && strVal.length > rule.maxLength) {
          strVal = strVal.slice(0, rule.maxLength)
        }
        result[propName] = strVal
        break
      }

      case 'number': {
        const numVal = Number(rawValue)
        if (isNaN(numVal)) {
          result[propName] = rule.default ?? 0
        } else {
          let clamped = numVal
          if (rule.min !== undefined) clamped = Math.max(clamped, rule.min)
          if (rule.max !== undefined) clamped = Math.min(clamped, rule.max)
          result[propName] = clamped
        }
        break
      }

      case 'boolean':
        result[propName] = rawValue === 'true' || rawValue === '1' || rawValue === 'yes'
        break

      case 'enum':
        if (rule.enum?.includes(rawValue)) {
          result[propName] = rawValue
        } else {
          result[propName] = rule.default ?? rule.enum?.[0]
        }
        break
    }
  }

  return result
}

/**
 * 清洗事件 payload —— 防止原型链污染和函数注入
 */
export function sanitizePayload(payload: unknown): Record<string, unknown> {
  try {
    // JSON 序列化/反序列化：递归移除函数、Symbol、undefined、循环引用
    return JSON.parse(JSON.stringify(payload))
  } catch {
    return {}
  }
}
