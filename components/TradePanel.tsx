'use client'
import { useState, useEffect } from 'react'
import { Settings } from '@/lib/settings'
import { getTradeHistory } from '@/lib/trade'
import { TradeEvent } from '@/lib/supabase'

export default function TradePanel({
  settings,
  onManualTrade,
  tradeRunning
}: {
  settings: Settings
  onManualTrade: () => Promise<void>
  tradeRunning: boolean
}) {
  const [history, setHistory] = useState<TradeEvent[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const h = await getTradeHistory(50)
    setHistory(h)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const totalSent = history.reduce((s, e) => s + e.artifacts_sent, 0)
  const totalReceived = history.reduce((s, e) => s + e.artifacts_received, 0)
  const totalAccepted = history.reduce((s, e) => s + e.artifacts_accepted, 0)
  const netDelta = history.reduce((s, e) => s + e.net_trade_value_delta, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Stats */}
      <div className="card" style={{ padding: '10px 16px' }}>
        <div className="stat-strip">
          <span>CYCLES <span className="stat-value">{history.length}</span></span>
          <span>SENT <span className="stat-value">{totalSent}</span></span>
          <span>RECEIVED <span className="stat-value">{totalReceived}</span></span>
          <span>ACCEPTED <span className="stat-value">{totalAccepted}</span></span>
          <span>NET TV GAIN <span className="stat-value" style={{ color: netDelta >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
            {netDelta >= 0 ? '+' : ''}{netDelta.toFixed(2)}
          </span></span>
        </div>
      </div>

      {/* Controls */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">⇄ Trade Protocol</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={load} disabled={loading}>↺ Refresh</button>
            <button className="btn btn-primary" onClick={async () => { await onManualTrade(); load() }} disabled={tradeRunning}>
              {tradeRunning ? '◈ Syncing…' : '▶ Run Cycle Now'}
            </button>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)', lineHeight: 2 }}>
          <div>{'>'} Auto-cycle: every <span style={{ color: 'var(--accent)' }}>{settings.tradeCycleHours}h</span></div>
          <div>{'>'} Outbound threshold: tradeValue <span style={{ color: 'var(--accent)' }}>&gt; 3.0</span></div>
          <div>{'>'} Conflict resolution: <span style={{ color: 'var(--accent2)' }}>LLM audit YES/NO</span></div>
          <div>{'>'} Correction history: <span style={{ color: '#c084fc' }}>merged on accept</span></div>
        </div>
      </div>

      {/* History */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">◎ Cycle History</span>
        </div>

        {loading && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text3)', padding: '12px 0' }}>
            {'> LOADING TRADE HISTORY…'}
          </div>
        )}

        {!loading && history.length === 0 && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text3)', padding: '12px 0' }}>
            {'> NO TRADE CYCLES YET — connect peers and run a cycle'}
          </div>
        )}

        {history.map(event => (
          <div key={event.id} style={{
            padding: '12px 0',
            borderBottom: '1px solid var(--border)',
            display: 'grid',
            gridTemplateColumns: '160px 1fr',
            gap: 12,
            alignItems: 'start'
          }}>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>
                {new Date(event.cycle_timestamp).toLocaleString()}
              </div>
              <div style={{ marginTop: 4 }}>
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 10, padding: '2px 6px',
                  borderRadius: 2, background: 'rgba(0,229,160,0.1)', color: 'var(--accent)'
                }}>
                  +{event.net_trade_value_delta.toFixed(2)} TV
                </span>
              </div>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', lineHeight: 2 }}>
              <span style={{ color: 'var(--text)' }}>↑{event.artifacts_sent}</span> sent ·{' '}
              <span style={{ color: 'var(--text)' }}>↓{event.artifacts_received}</span> received ·{' '}
              <span style={{ color: 'var(--accent)' }}>✓{event.artifacts_accepted}</span> accepted ·{' '}
              <span style={{ color: 'var(--text3)' }}>✕{event.artifacts_rejected}</span> rejected
              {event.peer_ids?.length > 0 && (
                <div style={{ color: 'var(--text3)', marginTop: 2 }}>
                  peers: {event.peer_ids.join(', ')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
