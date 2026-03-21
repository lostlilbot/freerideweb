import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Correction = {
  timestamp: number
  original: string
  corrected: string
  impact: number
}

export type Artifact = {
  id: string
  timestamp: number
  specialty: 'code' | 'research' | 'general'
  input: string
  output: string
  self_rating: number
  peer_rating: number
  trade_value?: number
  agent_id: string
  agent_alias: string
  correction_history: Correction[]
  retrieval_count: number
  source: 'local' | 'peer'
}

export type Peer = {
  id: string
  agent_id: string
  alias: string
  specialty: string
  avg_trade_value: number
  artifact_count: number
  last_active: number
  bin_url: string
  status: 'connected' | 'pending' | 'blocked'
}

export type TradeEvent = {
  id: string
  cycle_timestamp: number
  artifacts_sent: number
  artifacts_received: number
  artifacts_accepted: number
  artifacts_rejected: number
  net_trade_value_delta: number
  peer_ids: string[]
}
