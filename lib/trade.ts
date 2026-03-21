import { supabase, Artifact, TradeEvent } from './supabase'
import { compareArtifacts } from './openrouter'

export async function runTradeCycle(
  apiKey: string,
  modelQueue: string[],
  agentId: string,
  agentAlias: string
): Promise<TradeEvent> {
  const cycleTs = Date.now()
  let sent = 0, received = 0, accepted = 0, rejected = 0, delta = 0

  // OUTBOUND: push local artifacts with tradeValue > 3
  const { data: outbound } = await supabase
    .from('artifacts')
    .select('*')
    .gt('trade_value', 3.0)
    .eq('source', 'local')
    .order('trade_value', { ascending: false })
    .limit(20)

  if (outbound?.length) {
    await supabase.from('directory').upsert({
      agent_id: agentId,
      alias: agentAlias,
      avg_trade_value: outbound.reduce((s: number, a: Artifact) => s + (a.trade_value ?? 0), 0) / outbound.length,
      artifact_count: outbound.length,
      last_active: cycleTs,
      public_endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/artifacts?agent_id=eq.${agentId}&select=*`
    }, { onConflict: 'agent_id' })
    sent = outbound.length
  }

  // INBOUND: fetch from connected peers
  const { data: peers } = await supabase
    .from('peers')
    .select('*')
    .eq('status', 'connected')

  for (const peer of peers ?? []) {
    if (!peer.bin_url) continue
    try {
      const res = await fetch(peer.bin_url, {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''}`
        }
      })
      if (!res.ok) continue

      const peerArtifacts: Artifact[] = await res.json()
      received += peerArtifacts.length

      for (const pa of peerArtifacts) {
        if (!pa.input || !pa.output) continue

        const { data: existing } = await supabase
          .from('artifacts')
          .select('id, output, trade_value')
          .eq('specialty', pa.specialty)
          .ilike('input', `%${pa.input.slice(0, 40)}%`)
          .maybeSingle()

        if (!existing) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id: _id, trade_value: _tv, ...rest } = pa
          await supabase.from('artifacts').insert({
            ...rest,
            source: 'peer',
            peer_rating: pa.trade_value ?? 0,
            self_rating: 0
          })
          accepted++
          delta += pa.trade_value ?? 0
        } else {
          const better = await compareArtifacts(apiKey, modelQueue, existing.output, pa.output)
          if (better) {
            await supabase.from('artifacts').update({
              output: pa.output,
              peer_rating: pa.trade_value ?? 0,
              correction_history: pa.correction_history ?? []
            }).eq('id', existing.id)
            accepted++
            delta += (pa.trade_value ?? 0) - (existing.trade_value ?? 0)
          } else {
            rejected++
          }
        }
      }

      await supabase.from('peers').update({ last_active: cycleTs }).eq('id', peer.id)
    } catch (e) {
      console.error(`Trade cycle error for peer ${peer.alias}:`, e)
    }
  }

  const event: Omit<TradeEvent, 'id'> = {
    cycle_timestamp: cycleTs,
    artifacts_sent: sent,
    artifacts_received: received,
    artifacts_accepted: accepted,
    artifacts_rejected: rejected,
    net_trade_value_delta: Number(delta.toFixed(4)),
    peer_ids: (peers ?? []).map((p: { agent_id: string }) => p.agent_id)
  }

  await supabase.from('trade_history').insert(event)
  return { id: crypto.randomUUID(), ...event }
}

export async function connectToPeer(peer: {
  agent_id: string
  alias: string
  specialty: string
  avg_trade_value: number
  artifact_count: number
  public_endpoint: string
}): Promise<void> {
  await supabase.from('peers').upsert({
    agent_id: peer.agent_id,
    alias: peer.alias,
    specialty: peer.specialty,
    avg_trade_value: peer.avg_trade_value,
    artifact_count: peer.artifact_count,
    last_active: Date.now(),
    bin_url: peer.public_endpoint,
    status: 'connected'
  }, { onConflict: 'agent_id' })
}

export async function getTradeHistory(limit = 20): Promise<TradeEvent[]> {
  const { data } = await supabase
    .from('trade_history')
    .select('*')
    .order('cycle_timestamp', { ascending: false })
    .limit(limit)
  return data ?? []
}
