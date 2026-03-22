'use client'
import { useState, useEffect } from 'react'
import { Settings } from '@/lib/settings'
import { getSupabase, Peer } from '@/lib/getSupabase()'
import { connectToPeer } from '@/lib/trade'

type DirectoryEntry = {
  agent_id: string
  alias: string
  specialty: string
  avg_trade_value: number
  artifact_count: number
  last_active: number
  public_endpoint: string
}

export default function AgentHub({ settings }: { settings: Settings }) {
  const [tab, setTab] = useState<'registry' | 'handshake' | 'network'>('registry')
  const [directory, setDirectory] = useState<DirectoryEntry[]>([])
  const [peers, setPeers] = useState<Peer[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('')
  const [minRating, setMinRating] = useState(0)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const loadDirectory = async () => {
    setLoading(true)
    const { data } = await getSupabase().from('directory').select('*').order('avg_trade_value', { ascending: false })
    setDirectory((data ?? []).filter((d: DirectoryEntry) => d.agent_id !== settings.agentId))
    setLoading(false)
  }

  const loadPeers = async () => {
    const { data } = await getSupabase().from('peers').select('*').order('avg_trade_value', { ascending: false })
    setPeers(data ?? [])
  }

  useEffect(() => {
    loadDirectory()
    loadPeers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const connect = async (entry: DirectoryEntry) => {
    setConnecting(entry.agent_id)
    try {
      await connectToPeer({
        agent_id: entry.agent_id,
        alias: entry.alias,
        specialty: entry.specialty,
        avg_trade_value: entry.avg_trade_value,
        artifact_count: entry.artifact_count,
        public_endpoint: entry.public_endpoint
      })
      setMsg(`Connected to ${entry.alias}`)
      await loadPeers()
    } catch { setMsg('Connection failed') }
    finally { setConnecting(null) }
  }

  const disconnect = async (peer: Peer) => {
    await getSupabase().from('peers').update({ status: 'blocked' }).eq('id', peer.id)
    await loadPeers()
  }

  const filtered = directory.filter(d =>
    (filter === '' || d.alias.toLowerCase().includes(filter.toLowerCase()) || d.specialty.includes(filter)) &&
    d.avg_trade_value >= minRating
  )

  const connectedIds = new Set(peers.filter(p => p.status === 'connected').map(p => p.agent_id))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="card" style={{ padding: '10px 16px' }}>
        <div className="stat-strip">
          <span>DIRECTORY <span className="stat-value">{directory.length}</span> agents</span>
          <span>CONNECTED <span className="stat-value">{peers.filter(p => p.status === 'connected').length}</span></span>
          <span>YOUR ID <span className="stat-value mono" style={{ fontSize: 10 }}>{settings.agentId}</span></span>
        </div>
      </div>

      {msg && (
        <div className="card" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 12 }}>
          ✓ {msg}
        </div>
      )}

      <div className="card">
        <div className="tabs">
          {(['registry', 'handshake', 'network'] as const).map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'registry' ? '⬡ Registry' : t === 'handshake' ? '⇄ Handshake' : '◈ My Network'}
            </button>
          ))}
        </div>

        {/* REGISTRY TAB */}
        {tab === 'registry' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="Filter by alias or specialty…" value={filter} onChange={e => setFilter(e.target.value)} style={{ flex: 1 }} />
              <input className="input" type="number" placeholder="Min rating" min={0} max={5} step={0.5} value={minRating || ''} onChange={e => setMinRating(parseFloat(e.target.value) || 0)} style={{ width: 110 }} />
              <button className="btn btn-secondary" onClick={loadDirectory} disabled={loading}>
                {loading ? '…' : '↺ Refresh'}
              </button>
            </div>

            {filtered.length === 0 && (
              <div style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 12, padding: '20px 0', textAlign: 'center' }}>
                {loading ? '> SCANNING REGISTRY…' : '> NO AGENTS FOUND'}
              </div>
            )}

            {filtered.map(entry => (
              <div key={entry.agent_id} className="peer-card">
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--cond)', fontWeight: 600, fontSize: 14 }}>{entry.alias}</span>
                    <span className={`badge ${entry.specialty === 'code' ? 'badge-blue' : entry.specialty === 'research' ? 'badge-purple' : 'badge-green'}`}>
                      {entry.specialty}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', display: 'flex', gap: 16 }}>
                    <span>TV: <span style={{ color: 'var(--accent)' }}>{entry.avg_trade_value.toFixed(2)}</span></span>
                    <span>ARTIFACTS: {entry.artifact_count}</span>
                    <span>ACTIVE: {entry.last_active ? new Date(entry.last_active).toLocaleDateString() : '—'}</span>
                  </div>
                  <div className="rating-bar" style={{ marginTop: 6, width: 120 }}>
                    <div className="rating-fill" style={{ width: `${(entry.avg_trade_value / 5) * 100}%` }} />
                  </div>
                </div>
                <button
                  className={`btn ${connectedIds.has(entry.agent_id) ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={() => !connectedIds.has(entry.agent_id) && connect(entry)}
                  disabled={connecting === entry.agent_id || connectedIds.has(entry.agent_id)}
                  style={{ minWidth: 100 }}
                >
                  {connecting === entry.agent_id ? '…' : connectedIds.has(entry.agent_id) ? '✓ Connected' : '⇄ Connect'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* HANDSHAKE TAB */}
        {tab === 'handshake' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              <p>{'> Your agent card (share this with peers):'}</p>
            </div>
            <pre className="terminal-pane" style={{ whiteSpace: 'pre-wrap' }}>
{JSON.stringify({
  agent_id: settings.agentId,
  alias: settings.agentAlias,
  specialty: settings.specialty,
  avg_trade_value: '—',
  artifact_count: '—',
  public_endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/artifacts?agent_id=eq.${settings.agentId}&apikey=YOUR_ANON_KEY`
}, null, 2)}
            </pre>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>
              {'> Peers who connect to you appear automatically in My Network after their next sync cycle.'}
            </div>
          </div>
        )}

        {/* NETWORK TAB */}
        {tab === 'network' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-secondary" onClick={loadPeers} style={{ alignSelf: 'flex-start' }}>↺ Refresh</button>

            {peers.length === 0 && (
              <div style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 12, padding: '20px 0', textAlign: 'center' }}>
                {'> NO PEERS CONNECTED — use Registry to discover agents'}
              </div>
            )}

            {peers.map(peer => (
              <div key={peer.id} className="peer-card">
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--cond)', fontWeight: 600, fontSize: 14 }}>{peer.alias}</span>
                    <span className={`badge ${peer.status === 'connected' ? 'badge-green' : 'badge-warn'}`}>
                      {peer.status}
                    </span>
                    <span className={`badge ${peer.specialty === 'code' ? 'badge-blue' : 'badge-purple'}`}>
                      {peer.specialty}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', display: 'flex', gap: 16 }}>
                    <span>AVG TV: <span style={{ color: 'var(--accent)' }}>{peer.avg_trade_value.toFixed(2)}</span></span>
                    <span>ARTIFACTS: {peer.artifact_count}</span>
                    <span>LAST ACTIVE: {peer.last_active ? new Date(peer.last_active).toLocaleDateString() : '—'}</span>
                  </div>
                </div>
                <button className="btn btn-danger" onClick={() => disconnect(peer)}>✕ Disconnect</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
