import { getSupabase, Artifact, Correction } from './getSupabase()'

export async function getTopArtifacts(
  specialty: string,
  query: string,
  limit = 3
): Promise<Artifact[]> {
  const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3)

  const { data } = await getSupabase()
    .from('artifacts')
    .select('*')
    .gte('trade_value', 3.0)
    .eq('specialty', specialty)
    .order('trade_value', { ascending: false })
    .limit(50)

  if (!data?.length) return []

  const scored = (data as Artifact[]).map(a => {
    const text = `${a.input} ${a.output}`.toLowerCase()
    const hits = keywords.filter(k => text.includes(k)).length
    return { ...a, _score: hits }
  })

  return scored
    .sort((a, b) => b._score - a._score || (b.trade_value ?? 0) - (a.trade_value ?? 0))
    .slice(0, limit)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ _score: _unused, ...a }) => a as Artifact)
}

export function buildRAGPrompt(artifacts: Artifact[], userInput: string): string {
  if (!artifacts.length) return userInput
  const refs = artifacts
    .map(
      (a, i) =>
        `[Reference ${i + 1} — ${a.agent_alias} — TradeValue ${(a.trade_value ?? 0).toFixed(1)}]\nQ: ${a.input}\nA: ${a.output}`
    )
    .join('\n\n')
  return `The following are high-quality reference solutions from the knowledge graph:\n\n${refs}\n\n---\n\nNew task:\n${userInput}`
}

export async function saveArtifact(
  artifact: Omit<Artifact, 'id' | 'trade_value'>
): Promise<Artifact | null> {
  const { data, error } = await getSupabase()
    .from('artifacts')
    .insert(artifact)
    .select()
    .single()
  if (error) { console.error('saveArtifact:', error); return null }
  return data as Artifact
}

export async function addCorrection(
  artifactId: string,
  correction: Omit<Correction, 'timestamp' | 'impact'>
): Promise<void> {
  const { data: existing } = await getSupabase()
    .from('artifacts')
    .select('correction_history, self_rating')
    .eq('id', artifactId)
    .maybeSingle()

  if (!existing) return

  const history: Correction[] = (existing.correction_history as Correction[]) ?? []
  history.push({ ...correction, timestamp: Date.now(), impact: 0.5 })

  const newRating = Math.min(5, (existing.self_rating as number) + 0.5)

  await getSupabase()
    .from('artifacts')
    .update({ correction_history: history, self_rating: newRating })
    .eq('id', artifactId)
}

export async function getArtifacts(limit = 100): Promise<Artifact[]> {
  const { data } = await getSupabase()
    .from('artifacts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as Artifact[]
}
