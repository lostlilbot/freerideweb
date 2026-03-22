export type Message = { role: 'user' | 'assistant' | 'system'; content: string }

export type ModelInfo = {
  id: string
  name: string
  context_length: number
  pricing: { prompt: string; completion: string }
}

export async function fetchFreeModels(apiKey: string): Promise<ModelInfo[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` }
  })
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`)
  const data = await res.json() as { data: ModelInfo[] }
  return data.data.filter(
    m => m.pricing.prompt === '0' && m.pricing.completion === '0' && m.context_length >= 8192
  )
}

export async function callModel(
  apiKey: string,
  model: string,
  messages: Message[],
  onToken?: (token: string) => void
): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/lostlilbot/FreeRideWeb',
      'X-Title': 'FreeRideWeb Autonomous Node'
    },
    body: JSON.stringify({ model, messages, stream: !!onToken, max_tokens: 2048 })
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    const e = Object.assign(new Error(err.error?.message ?? 'API error'), { status: res.status })
    throw e
  }

  if (onToken && res.body) {
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let full = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))
      for (const line of lines) {
        const json = line.slice(6)
        if (json === '[DONE]') continue
        try {
          const delta = (JSON.parse(json) as { choices?: [{ delta?: { content?: string } }] })
            .choices?.[0]?.delta?.content
          if (delta) { full += delta; onToken(delta) }
        } catch { /* partial chunk */ }
      }
    }
    return full
  }

  const data = await res.json() as { choices?: [{ message?: { content?: string } }] }
  return data.choices?.[0]?.message?.content ?? ''
}

export async function callWithFailover(
  apiKey: string,
  queue: string[],
  messages: Message[],
  onToken?: (token: string) => void,
  onModelSwitch?: (model: string, reason: string) => void
): Promise<{ output: string; modelUsed: string }> {
  for (const model of queue) {
    try {
      const output = await callModel(apiKey, model, messages, onToken)
      return { output, modelUsed: model }
    } catch (err: unknown) {
      const status = (err as { status?: number }).status
      if (status === 429 || status === 503) {
        onModelSwitch?.(model, status === 429 ? 'rate limited' : 'overloaded')
        continue
      }
      throw err
    }
  }
  throw new Error('All models in failover queue exhausted')
}

export async function auditOutput(
  apiKey: string,
  queue: string[],
  output: string
): Promise<number> {
  const { output: rating } = await callWithFailover(apiKey, queue, [{
    role: 'user',
    content: `Rate the quality and correctness of this output from 1 to 5. Reply with a single integer only.\n\n${output}`
  }])
  const parsed = parseInt(rating.trim())
  return isNaN(parsed) ? 3 : Math.min(5, Math.max(1, parsed))
}

export async function classifySpecialty(
  apiKey: string,
  queue: string[],
  input: string
): Promise<'code' | 'research' | 'general'> {
  const { output } = await callWithFailover(apiKey, queue, [{
    role: 'user',
    content: `Classify this task as exactly one of: code, research, general. Reply with one word only.\n\n${input}`
  }])
  const t = output.trim().toLowerCase()
  if (t === 'code' || t === 'research') return t
  return 'general'
}

export async function compareArtifacts(
  apiKey: string,
  queue: string[],
  local: string,
  peer: string
): Promise<boolean> {
  const { output } = await callWithFailover(apiKey, queue, [{
    role: 'user',
    content: `Given existing solution:\n${local}\n\nIncoming solution:\n${peer}\n\nIs the incoming solution more correct, more efficient, or more complete? Reply YES or NO only.`
  }])
  return output.trim().toUpperCase().startsWith('Y')
}
