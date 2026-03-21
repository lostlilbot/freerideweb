'use client'
import { useState } from 'react'
import { Settings } from '@/lib/settings'

type Source = { id: string; label: string; url: string; specialty: string; desc: string }

const SOURCES: Source[] = [
  { id: 'issuehunt', label: 'IssueHunt', url: 'https://issuehunt.io/repos', specialty: 'code', desc: 'Funded GitHub issues — cash per merged PR' },
  { id: 'gitcoin', label: 'Gitcoin', url: 'https://gitcoin.co/explorer', specialty: 'code', desc: 'Web3 open source bounties' },
  { id: 'replit', label: 'Replit Bounties', url: 'https://replit.com/bounties', specialty: 'code', desc: 'Real-money coding tasks on Replit' },
  { id: 'algora', label: 'Algora', url: 'https://console.algora.io', specialty: 'code', desc: 'OSS bounty board — high payouts' },
  { id: 'bountysource', label: 'Bountysource', url: 'https://www.bountysource.com', specialty: 'code', desc: 'Classic bug bounty platform' },
]

export default function BountyBoard({ settings, onNav }: { settings: Settings; onNav: () => void }) {
  const [task, setTask] = useState('')
  const [activeSource, setActiveSource] = useState<Source | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="card" style={{ padding: '10px 16px' }}>
        <div className="stat-strip">
          <span>SOURCES <span className="stat-value">{SOURCES.length}</span></span>
          <span>SPECIALTY <span className="stat-value">{settings.specialty.toUpperCase()}</span></span>
          <span style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 11 }}>
            Paste a bounty task → agent formats output for submission
          </span>
        </div>
      </div>

      {/* Source cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
        {SOURCES.map(s => (
          <div
            key={s.id}
            className="card"
            style={{
              cursor: 'pointer',
              borderColor: activeSource?.id === s.id ? 'var(--accent)' : 'var(--border)',
              transition: 'border-color 0.15s'
            }}
            onClick={() => setActiveSource(s)}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--cond)', fontWeight: 600, fontSize: 14 }}>{s.label}</span>
              <span className="badge badge-blue">{s.specialty}</span>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', marginBottom: 10 }}>{s.desc}</div>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ fontSize: 11, padding: '4px 10px', display: 'inline-flex' }}
              onClick={e => e.stopPropagation()}
            >
              ↗ Open
            </a>
          </div>
        ))}
      </div>

      {/* Task input */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">◎ Paste Bounty Task</span>
          {activeSource && <span className="badge badge-green">{activeSource.label}</span>}
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
          {'>'} Paste the full task description below. Agent will format output with task ID, solution, and confidence score ready for submission.
        </div>
        <textarea
          className="input"
          placeholder="Paste bounty task description here…"
          value={task}
          onChange={e => setTask(e.target.value)}
          rows={5}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            className="btn btn-primary"
            disabled={!task.trim()}
            onClick={() => {
              // Pass task to terminal
              if (typeof window !== 'undefined') {
                localStorage.setItem('freerideWeb_pending_task', task)
              }
              onNav()
            }}
          >
            ▶ Send to Agent
          </button>
          <button className="btn btn-secondary" onClick={() => setTask('')}>Clear</button>
        </div>
      </div>
    </div>
  )
}
