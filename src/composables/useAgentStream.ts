import { ref, type Ref } from 'vue'

/**
 * Agent 状态（可扩展，默认含常用值）
 */
export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'streaming'
  | 'tool-calling'
  | 'completed'
  | 'failed'
  | 'interrupted'

export interface AgentStatusStep {
  /** 步骤唯一标识 */
  id: string
  /** 状态/阶段 */
  status: AgentStatus | string
  /** 可读名称，如 "正在检索 JD" */
  label?: string
  /** 详细信息 */
  detail?: string
  /** 开始时间戳 */
  startedAt: number
  /** 完成时间戳 */
  finishedAt?: number
}

/**
 * 流式帧解析器：将 ReadableStream 的 chunk 文本解析成语义事件
 *
 * 返回的事件类型:
 *   - `message` : 正文增量（会被追加到 content）
 *   - `status`  : Agent 状态变化
 *   - `step`    : Agent 状态步骤（新增或更新）
 *   - `meta`    : 元数据（例如 conversationId）
 *   - `done`    : 流结束
 */
export interface StreamEvent {
  type: 'message' | 'status' | 'step' | 'meta' | 'done' | 'error'
  data?: unknown
}

export type FrameParser = (chunk: string, state: { buffer: string }) => StreamEvent[]

/**
 * 默认：SSE 帧解析（`data: ...\n\n` 形式）
 *
 * 约定 payload 为 JSON；字段 `content` → message 事件，`status` → status 事件，
 * `step` → step 事件，`conversationId` / `meta` → meta 事件，`[DONE]` 字面量 → done。
 */
export const sseParser: FrameParser = (chunk, state) => {
  state.buffer += chunk
  const events: StreamEvent[] = []
  let idx: number
  while ((idx = state.buffer.indexOf('\n\n')) !== -1) {
    const frame = state.buffer.slice(0, idx)
    state.buffer = state.buffer.slice(idx + 2)
    for (const line of frame.split('\n')) {
      if (!line.startsWith('data:')) continue
      const raw = line.slice(5).trim()
      if (!raw) continue
      if (raw === '[DONE]') {
        events.push({ type: 'done' })
        continue
      }
      try {
        const payload = JSON.parse(raw)
        events.push(...normalizePayload(payload))
      } catch {
        // 非 JSON → 作为纯文本 content
        events.push({ type: 'message', data: raw })
      }
    }
  }
  return events
}

/**
 * NDJSON / JSON Lines 解析器：每行一个 JSON 对象
 */
export const ndjsonParser: FrameParser = (chunk, state) => {
  state.buffer += chunk
  const events: StreamEvent[] = []
  let nl: number
  while ((nl = state.buffer.indexOf('\n')) !== -1) {
    const line = state.buffer.slice(0, nl).trim()
    state.buffer = state.buffer.slice(nl + 1)
    if (!line) continue
    try {
      const payload = JSON.parse(line)
      events.push(...normalizePayload(payload))
    } catch {
      events.push({ type: 'message', data: line })
    }
  }
  return events
}

/**
 * 纯文本解析器：chunk 即 message
 */
export const textParser: FrameParser = (chunk) => [{ type: 'message', data: chunk }]

function normalizePayload(payload: Record<string, unknown>): StreamEvent[] {
  const events: StreamEvent[] = []
  if (typeof payload['content'] === 'string') {
    events.push({ type: 'message', data: payload['content'] })
  } else if (typeof payload['delta'] === 'string') {
    events.push({ type: 'message', data: payload['delta'] })
  }
  if (typeof payload['status'] === 'string') {
    events.push({ type: 'status', data: payload['status'] })
  }
  if (payload['step'] && typeof payload['step'] === 'object') {
    events.push({ type: 'step', data: payload['step'] })
  }
  if (payload['conversationId'] || payload['sessionId'] || payload['meta']) {
    events.push({
      type: 'meta',
      data: {
        conversationId: payload['conversationId'] || payload['sessionId'],
        ...(typeof payload['meta'] === 'object' ? payload['meta'] : {}),
      },
    })
  }
  if (payload['done'] === true || payload['finish_reason']) {
    events.push({ type: 'done', data: payload['finish_reason'] })
  }
  if (payload['error']) {
    events.push({ type: 'error', data: payload['error'] })
  }
  return events
}

/**
 * `useAgentStream.start()` 的参数
 */
export interface StartStreamOptions {
  /** 目标 URL */
  url: string
  /** 请求方法（默认 POST） */
  method?: string
  /** 请求体 */
  body?: unknown
  /** 请求头（Content-Type 默认 application/json） */
  headers?: Record<string, string>
  /** 自定义 AbortController（留空则内部创建） */
  signal?: AbortSignal
  /** framing parser（默认 SSE） */
  parser?: FrameParser
  /** 续播前缀：将 partial content 作为初始值，流式 chunk 会追加到其后 */
  resumePrefix?: string

  // -- 回调 --
  /** 每次 content 有新增时触发 */
  onMessage?: (content: string, delta: string) => void
  /** status 变化 */
  onStatus?: (status: string) => void
  /** 新增/更新步骤 */
  onStep?: (step: AgentStatusStep) => void
  /** meta 信息（含 conversationId） */
  onMeta?: (meta: Record<string, unknown>) => void
  /** 正常结束 */
  onDone?: () => void
  /** 错误 */
  onError?: (err: Error) => void
}

/**
 * 真实的流式通信 composable（与 mock 的 `useStreamingText` 并存）
 *
 * 基于 `fetch` + `ReadableStream`，内置 SSE / NDJSON / 自定义 framing。
 *
 * @example
 * ```ts
 * const { content, isStreaming, statusSteps, start, abort } = useAgentStream()
 * await start({
 *   url: '/api/chat/stream',
 *   body: { message: 'hi' },
 *   onMeta: (m) => conversationId.value = m.conversationId,
 * })
 * ```
 */
export function useAgentStream() {
  const content: Ref<string> = ref('')
  const isStreaming = ref(false)
  const isInterrupted = ref(false)
  const status = ref<string>('idle')
  const statusSteps = ref<AgentStatusStep[]>([])
  const conversationId = ref<string | undefined>(undefined)
  const error = ref<Error | null>(null)

  let controller: AbortController | null = null

  function upsertStep(incoming: Partial<AgentStatusStep> & { id?: string }) {
    const step: AgentStatusStep = {
      id: incoming.id || `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      status: incoming.status || 'thinking',
      label: incoming.label,
      detail: incoming.detail,
      startedAt: incoming.startedAt ?? Date.now(),
      finishedAt: incoming.finishedAt,
    }
    const idx = statusSteps.value.findIndex((s) => s.id === step.id)
    if (idx >= 0) {
      statusSteps.value[idx] = { ...statusSteps.value[idx], ...step } as AgentStatusStep
    } else {
      statusSteps.value.push(step)
    }
    return step
  }

  async function start(opts: StartStreamOptions) {
    // 重置状态
    abort()
    controller = new AbortController()
    const signal = opts.signal || controller.signal
    isStreaming.value = true
    isInterrupted.value = false
    error.value = null
    status.value = 'streaming'
    if (opts.resumePrefix !== undefined) {
      content.value = opts.resumePrefix
    } else {
      content.value = ''
      statusSteps.value = []
    }

    const parser = opts.parser || sseParser
    const parserState = { buffer: '' }

    try {
      const res = await fetch(opts.url, {
        method: opts.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(opts.headers || {}),
        },
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal,
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      if (!res.body) {
        throw new Error('Response has no body')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let doneFlag = false

      while (!doneFlag) {
        const { value, done } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })
        const events = parser(text, parserState)
        for (const ev of events) {
          dispatchEvent(ev, opts)
          if (ev.type === 'done') doneFlag = true
        }
      }

      // flush 末尾
      const trailing = parser(decoder.decode(), parserState)
      for (const ev of trailing) dispatchEvent(ev, opts)

      isStreaming.value = false
      status.value = 'completed'
      opts.onDone?.()
    } catch (err) {
      isStreaming.value = false
      const e = err as Error
      if (e.name === 'AbortError') {
        isInterrupted.value = true
        status.value = 'interrupted'
        return
      }
      error.value = e
      status.value = 'failed'
      opts.onError?.(e)
    }
  }

  function dispatchEvent(ev: StreamEvent, opts: StartStreamOptions) {
    switch (ev.type) {
      case 'message': {
        const delta = String(ev.data ?? '')
        if (!delta) return
        content.value += delta
        opts.onMessage?.(content.value, delta)
        break
      }
      case 'status': {
        const s = String(ev.data)
        status.value = s
        opts.onStatus?.(s)
        break
      }
      case 'step': {
        const step = upsertStep(ev.data as Partial<AgentStatusStep>)
        opts.onStep?.(step)
        break
      }
      case 'meta': {
        const meta = (ev.data as Record<string, unknown>) || {}
        if (typeof meta['conversationId'] === 'string') {
          conversationId.value = meta['conversationId']
        }
        opts.onMeta?.(meta)
        break
      }
      case 'error': {
        const e = ev.data instanceof Error ? ev.data : new Error(String(ev.data))
        error.value = e
        opts.onError?.(e)
        break
      }
      case 'done':
        // 实际的 onDone 由 while 循环外调用，避免多次触发
        break
    }
  }

  function abort() {
    if (controller && isStreaming.value) {
      controller.abort()
    }
    controller = null
  }

  function reset() {
    abort()
    content.value = ''
    statusSteps.value = []
    status.value = 'idle'
    isInterrupted.value = false
    error.value = null
    conversationId.value = undefined
  }

  return {
    content,
    isStreaming,
    isInterrupted,
    status,
    statusSteps,
    conversationId,
    error,
    start,
    abort,
    reset,
  }
}
