'use client'
import { useState, useEffect } from 'react'
import { Settings, saveSettings } from '@/lib/settings'
import { fetchFreeModels, ModelInfo } from '@/lib/openrouter'

export default function ModelManager({ settings, onUpdate }: { settings: Settings; onUpdate: (s: Settings) => void }) {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [queue, setQueue] = useState<string[]>(settings.modelQueue)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastFetch, setLastFetch] = useState<number | null>(null)

  const fetch_ = async () => {
    if (!settings.openrouterKey) { setError('No API key — configure in Settings first'); return }
    setLoading(true); setError('')
    try {
      const list = await fetchFreeModels(settings.openrouterKey)
      setModels(list)
      setLastFetch(Date.now())
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (settings.openrouterKey) fetch_() }, [])

  const moveUp = (i: number) => {
    if (i === 0) return
    const q = [...queue]
    ;[q[i - 1], q[i]] = [q[i], q[i - 1]]
    setQueue(q)
  }

  const moveDown = (i: number) => {
    if (i === queue.length - 1) return
    const q = [...queue]
    ;[q[i], q[i + 1]] = [q[i + 1], q[i]]
    setQueue(q)
  }

  const addToQueue = (id: string) => {
    if (queue.includes(id)) return
    setQueue([...queue, id])
  }

  const removeFromQueue = (id: string) => {
    setQueue(queue.filter(q => q !== id))
  }

  const saveQueue = () => {
    const updated = { ...settings, modelQueue: queue }
    saveSettings({ modelQueue: queue })
    onUpdate(updated)
  }

  const inQueue = new Set(queue)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="card" style={{ padding: '10px 16px' }}>
        <div className="stat-strip">
          <span>FREE MODELS AVAILABLE <span className="stat-value">{models.length}</span></span>
          <span>QUEUE LENGTH <span className="stat-value">{queue.length}</span></span>
          {lastFetch && <span>LAST FETCH <span className="stat-value">{new Date(lastFetch).toLocaleTimeString()}</span></span>}
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', fontFamily: 'var(--mono)', fontSize: 12 }}>
          {'> ERROR: '}{error}
        </div>
      )}

      {/* Priority Queue */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">◈ Failover Priority Queue</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={fetch_} disabled={loading}>{loading ? '…' : '↺ Refresh Models'}</button>
            <button className="btn btn-primary" onClick={saveQueue}>Save Queue</button>
          </div>
        </div>

        {queue.length === 0 && (
          <div style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 12, padding: '12px 0' }}>
            {'> QUEUE EMPTY — add models from the list below'}
          </div>
        )}

        {queue.map((id, i) => (
          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', minWidth: 20 }}>#{i + 1}</span>
            {i === 0 && <span className="badge badge-green">PRIMARY</span>}
            {i > 0 && <span className="badge" style={{ color: 'var(--text3)' }}>FALLBACK</span>}
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, flex: 1, color: 'var(--text)' }}>{id}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => moveUp(i)} disabled={i === 0}>↑</button>
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => moveDown(i)} disabled={i === queue.length - 1}>↓</button>
              <button className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => removeFromQueue(id)}>✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* Available models */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">⬡ Available Free Models</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>
            filter: prompt=0 · completion=0 · ctx≥8k
          </span>
        </div>

        {loading && (
          <div style={{ color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 12, padding: '12px 0' }}>
            {'> FETCHING openrouter.ai/api/v1/models…'}
          </div>
        )}

        {models.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: inQueue.has(m.id) ? 'var(--accent)' : 'var(--text)' }}>{m.id}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                ctx: {(m.context_length / 1000).toFixed(0)}k tokens
              </div>
            </div>
            <button
              className={`btn ${inQueue.has(m.id) ? 'btn-secondary' : 'btn-primary'}`}
              style={{ padding: '4px 12px', fontSize: 11 }}
              onClick={() => inQueue.has(m.id) ? removeFromQueue(m.id) : addToQueue(m.id)}
            >
              {inQueue.has(m.id) ? '✓ In Queue' : '+ Add'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
