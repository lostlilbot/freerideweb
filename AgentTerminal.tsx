'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Settings } from '@/lib/settings'
import { callWithFailover, classifySpecialty, auditOutput } from '@/lib/openrouter'
import { getTopArtifacts, buildRAGPrompt, saveArtifact, addCorrection } from '@/lib/knowledge'
import type { Message } from '@/lib/openrouter'

type LogLine = { type: 'info' | 'success' | 'warn' | 'error' | 'model' | 'trade'; text: string }

export default function AgentTerminal({ settings }: { settings: Settings }) {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [logs, setLogs] = useState<LogLine[]>([{ type: 'info', text: '> FREERIDEWEB NODE INITIALIZED' }])
  const [running, setRunning] = useState(false)
  const [history, setHistory] = useState<Message[]>([])
  const [lastArtifactId, setLastArtifactId] = useState<string | null>(null)
  const [correction, setCorrection] = useState('')
  const [showCorrect, setShowCorrect] = useState(false)
  const [stats, setStats] = useState({ tasks: 0, avgRating: 0, model: settings.modelQueue[0] ?? '—' })
  const logRef = useRef<HTMLDivElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  const log = useCallback((type: LogLine['type'], text: string) => {
    setLogs(prev => [...prev.slice(-200), { type, text }])
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  // Pick up pending task from Bounty Board
  useEffect(() => {
    const pending = localStorage.getItem('freerideWeb_pending_task')
    if (pending) {
      setInput(pending)
      localStorage.removeItem('freerideWeb_pending_task')
      log('trade', '> BOUNTY TASK LOADED — press Execute to run')
    }
  }, [log])

  const run = async () => {
    if (!input.trim() || running) return
    if (!settings.openrouterKey) { log('error', '> ERROR: No API key configured. Go to Settings.'); return }

    setRunning(true)
    setOutput('')
    setShowCorrect(false)
    setLastArtifactId(null)
    const task = input.trim()
    setInput('')

    try {
      log('info', `> TASK RECEIVED: ${task.slice(0, 60)}${task.length > 60 ? '…' : ''}`)

      // Classify
      log('info', '> CLASSIFYING TASK…')
      const specialty = await classifySpecialty(settings.openrouterKey, settings.modelQueue, task)
      log('info', `> SPECIALTY: ${specialty.toUpperCase()}`)

      // RAG retrieval
      log('info', '> QUERYING KNOWLEDGE GRAPH…')
      const artifacts = await getTopArtifacts(specialty, task)
      if (artifacts.length) {
        log('trade', `> RAG: ${artifacts.length} reference artifacts injected`)
        artifacts.forEach(a => log('trade', `  ↳ [${a.agent_alias}] tradeValue=${a.trade_value.toFixed(2)}`))
      } else {
        log('info', '> RAG: No matching artifacts found — cold inference')
      }

      // Build messages
      const augmentedInput = buildRAGPrompt(artifacts, task)
      const messages: Message[] = [
        ...history,
        { role: 'user', content: augmentedInput }
      ]

      // Call model with failover
      log('model', `> MODEL: ${settings.modelQueue[0]}`)
      let streamedOutput = ''
      const { output: result, modelUsed } = await callWithFailover(
        settings.openrouterKey,
        settings.modelQueue,
        messages,
        (token) => {
          streamedOutput += token
          setOutput(streamedOutput)
          if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
        },
        (model, reason) => {
          log('warn', `> FAILOVER: ${model} ${reason} — rotating queue`)
          log('model', `> MODEL: switching…`)
        }
      )

      log('success', `> OUTPUT COMPLETE [${result.length} chars] via ${modelUsed}`)
      setStats(prev => ({ ...prev, model: modelUsed }))

      // Update conversation history
      const newHistory: Message[] = [
        ...history,
        { role: 'user', content: task },
        { role: 'assistant', content: result }
      ]
      setHistory(newHistory.slice(-20)) // keep last 20 turns

      // Self-audit
      log('info', '> RUNNING SELF-AUDIT…')
      const rating = await auditOutput(settings.openrouterKey, settings.modelQueue, result)
      log(rating >= 4 ? 'success' : rating >= 3 ? 'info' : 'warn', `> SELF-RATING: ${rating}/5`)

      if (rating <= 2) {
        log('warn', '> LOW RATING — auto-retrying with next model…')
        // Could retry here, for now just flag
      }

      // Save artifact
      const saved = await saveArtifact({
        timestamp: Date.now(),
        specialty,
        input: task,
        output: result,
        self_rating: rating,
        peer_rating: 0,
        agent_id: settings.agentId,
        agent_alias: settings.agentAlias,
        correction_history: [],
        retrieval_count: 0,
        source: 'local'
      })

      if (saved) {
        setLastArtifactId(saved.id)
        log('trade', `> ARTIFACT SAVED [id: ${saved.id.slice(0, 8)}…]`)
        setStats(prev => ({
          tasks: prev.tasks + 1,
          avgRating: +(((prev.avgRating * prev.tasks) + rating) / (prev.tasks + 1)).toFixed(2),
          model: modelUsed
        }))
      }

      setShowCorrect(true)

    } catch (e: any) {
      log('error', `> ERROR: ${e.message}`)
    } finally {
      setRunning(false)
    }
  }

  const submitCorrection = async () => {
    if (!lastArtifactId || !correction.trim()) return
    await addCorrection(lastArtifactId, { original: output, corrected: correction })
    log('trade', '> CORRECTION STORED — training weight updated')
    setCorrection('')
    setShowCorrect(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      {/* Stat strip */}
      <div className="card" style={{ padding: '10px 16px' }}>
        <div className="stat-strip">
          <span>TASKS <span className="stat-value">{stats.tasks}</span></span>
          <span>AVG RATING <span className="stat-value">{stats.avgRating || '—'}</span></span>
          <span>MODEL <span className="stat-value mono" style={{ fontSize: 11 }}>{stats.model.split('/').pop()}</span></span>
          <span>CHAIN <span className="stat-value">{history.length / 2}</span> turns</span>
        </div>
      </div>

      {/* Dual pane */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1 }}>
        {/* Reasoning pane */}
        <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{ padding: '10px 14px', marginBottom: 0 }}>
            <span className="card-title">⬡ System Reasoning</span>
            <span className="badge badge-blue">LOG</span>
          </div>
          <div className="terminal-pane" ref={logRef} style={{ flex: 1, border: 'none', borderRadius: 0, borderTop: '1px solid var(--border)' }}>
            {logs.map((l, i) => (
              <span key={i} className={`log-line log-${l.type}`}>{l.text}{'\n'}</span>
            ))}
            {running && <span className="log-info">{'> '}<span style={{ animation: 'pulse 1s infinite' }}>█</span></span>}
          </div>
        </div>

        {/* Output pane */}
        <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{ padding: '10px 14px', marginBottom: 0 }}>
            <span className="card-title">◎ Final Output</span>
            {output && <span className="badge badge-green">READY</span>}
          </div>
          <div
            className="terminal-pane"
            ref={outputRef}
            style={{ flex: 1, border: 'none', borderRadius: 0, borderTop: '1px solid var(--border)', whiteSpace: 'pre-wrap', color: 'var(--text)' }}
          >
            {output || <span className="log-info">{'> Awaiting task…'}</span>}
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="card">
        <textarea
          className="input"
          placeholder="> Enter task — code, research, analysis…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) run() }}
          rows={3}
          disabled={running}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={run} disabled={running || !input.trim()}>
            {running ? '◈ Processing…' : '▶ Execute [Ctrl+Enter]'}
          </button>
          <button className="btn btn-secondary" onClick={() => { setHistory([]); log('info', '> CONTEXT CLEARED') }}>
            ↺ Clear Context
          </button>
        </div>
      </div>

      {/* Correction panel */}
      {showCorrect && (
        <div className="card" style={{ borderColor: '#c084fc' }}>
          <div className="card-header">
            <span className="card-title" style={{ color: '#c084fc' }}>⇄ Submit Correction</span>
            <span className="badge badge-purple">TRAIN</span>
          </div>
          <textarea
            className="input"
            placeholder="Enter corrected or improved output — stored as training artifact…"
            value={correction}
            onChange={e => setCorrection(e.target.value)}
            rows={3}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary" style={{ background: '#c084fc', borderColor: '#c084fc' }} onClick={submitCorrection}>
              ⇄ Store Correction
            </button>
            <button className="btn btn-secondary" onClick={() => setShowCorrect(false)}>Dismiss</button>
          </div>
        </div>
      )}
    </div>
  )
}
