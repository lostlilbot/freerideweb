'use client'
import { useState } from 'react'
import { Settings, saveSettings } from '@/lib/settings'

export default function SettingsPanel({ settings, onSave }: { settings: Settings; onSave: (s: Settings) => void }) {
  const [form, setForm] = useState<Settings>({ ...settings })
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)

  const set = (k: keyof Settings, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  const save = () => {
    saveSettings(form)
    onSave(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {saved && (
        <div className="card" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 12 }}>
          {'> SETTINGS SAVED — changes applied immediately'}
        </div>
      )}

      {/* API Keys */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">⚙ API Configuration</span>
          <span className="badge badge-green">ENCRYPTED LOCAL</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
              OPENROUTER API KEY
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                type={showKey ? 'text' : 'password'}
                placeholder="sk-or-v1-…"
                value={form.openrouterKey}
                onChange={e => set('openrouterKey', e.target.value)}
              />
              <button className="btn btn-secondary" style={{ minWidth: 70 }} onClick={() => setShowKey(!showKey)}>
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
              Stored in browser localStorage only. Never sent to any server except OpenRouter.
            </div>
          </div>
        </div>
      </div>

      {/* Agent Identity */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">⬡ Agent Identity</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>AGENT ALIAS</label>
            <input className="input" value={form.agentAlias} onChange={e => set('agentAlias', e.target.value)} placeholder="My FreeRideWeb Node" />
          </div>
          <div>
            <label style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>AGENT ID (auto-generated)</label>
            <input className="input" value={form.agentId} readOnly style={{ opacity: 0.5 }} />
          </div>
          <div>
            <label style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>PRIMARY SPECIALTY</label>
            <select
              className="input"
              value={form.specialty}
              onChange={e => set('specialty', e.target.value as Settings['specialty'])}
              style={{ cursor: 'pointer' }}
            >
              <option value="general">General</option>
              <option value="code">Code</option>
              <option value="research">Research</option>
            </select>
          </div>
        </div>
      </div>

      {/* Trade Config */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">⇄ Trade Protocol</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
              TRADE CYCLE INTERVAL (hours)
            </label>
            <input
              className="input"
              type="number"
              min={1} max={24}
              value={form.tradeCycleHours}
              onChange={e => set('tradeCycleHours', parseInt(e.target.value) || 6)}
            />
          </div>
          <div>
            <label style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
              AUTO-ACCEPT THRESHOLD (min peer tradeValue 0–5)
            </label>
            <input
              className="input"
              type="number"
              min={0} max={5} step={0.1}
              value={form.autoAcceptThreshold}
              onChange={e => set('autoAcceptThreshold', parseFloat(e.target.value) || 3.5)}
            />
          </div>
        </div>
      </div>

      {/* Supabase info */}
      <div className="card" style={{ borderColor: 'var(--border2)' }}>
        <div className="card-header">
          <span className="card-title">◈ Supabase Backend</span>
          <span className="badge badge-blue">ENV VARS</span>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', lineHeight: 2 }}>
          <div>{'>'} NEXT_PUBLIC_SUPABASE_URL: <span style={{ color: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'var(--accent)' : 'var(--danger)' }}>
            {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ configured' : '✕ missing — set in Vercel env vars'}
          </span></div>
          <div>{'>'} NEXT_PUBLIC_SUPABASE_ANON_KEY: <span style={{ color: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'var(--accent)' : 'var(--danger)' }}>
            {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ configured' : '✕ missing — set in Vercel env vars'}
          </span></div>
          <div style={{ marginTop: 8, color: 'var(--text3)' }}>
            {'>'} Schema: run supabase/schema.sql in your Supabase SQL editor
          </div>
        </div>
      </div>

      <button className="btn btn-primary" onClick={save} style={{ alignSelf: 'flex-start', padding: '10px 24px' }}>
        ✓ Save Settings
      </button>
    </div>
  )
}
