'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import AgentTerminal from '@/components/AgentTerminal'
import AgentHub from '@/components/AgentHub'
import ModelManager from '@/components/ModelManager'
import BountyBoard from '@/components/BountyBoard'
import TradePanel from '@/components/TradePanel'
import SettingsPanel from '@/components/SettingsPanel'
import { getSettings, Settings } from '@/lib/settings'
import { runTradeCycle } from '@/lib/trade'

type Page = 'terminal' | 'hub' | 'models' | 'bounty' | 'trade' | 'settings'

export default function AppShell() {
  const [page, setPage] = useState<Page>('terminal')
  const [settings, setSettings] = useState<Settings>(getSettings())
  const [lastTrade, setLastTrade] = useState<number | null>(null)
  const [tradeRunning, setTradeRunning] = useState(false)
  const [configured, setConfigured] = useState(false)
  const tradeTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const hasSupabase = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    setConfigured(hasSupabase)
  }, [])

  const executeTrade = useCallback(async (s: Settings) => {
    if (!s.openrouterKey || tradeRunning || !configured) return
    setTradeRunning(true)
    try {
      await runTradeCycle(s.openrouterKey, s.modelQueue, s.agentId, s.agentAlias)
      setLastTrade(Date.now())
    } catch (e) {
      console.error('Auto trade cycle:', e)
    } finally {
      setTradeRunning(false)
    }
  }, [tradeRunning, configured])

  useEffect(() => {
    if (tradeTimer.current) clearInterval(tradeTimer.current)
    const ms = settings.tradeCycleHours * 60 * 60 * 1000
    tradeTimer.current = setInterval(() => executeTrade(settings), ms)
    return () => { if (tradeTimer.current) clearInterval(tradeTimer.current) }
  }, [settings, executeTrade])

  const pages: { id: Page; label: string; icon: string; section?: string }[] = [
    { id: 'terminal', label: 'Terminal', icon: '▶', section: 'AGENT' },
    { id: 'hub', label: 'Agent Hub', icon: '⬡', section: 'NETWORK' },
    { id: 'trade', label: 'Trade Log', icon: '⇄' },
    { id: 'models', label: 'Models', icon: '◈', section: 'SYSTEM' },
    { id: 'bounty', label: 'Bounties', icon: '◎' },
    { id: 'settings', label: 'Settings', icon: '⚙' }
  ]

  const handleManualTrade = async () => { await executeTrade(settings) }

  if (!configured) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 32 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 18, color: 'var(--accent)' }}>⬡ FreeRideWeb</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--warn)', textAlign: 'center', maxWidth: 480, lineHeight: 2 }}>
          {'> ERROR: Supabase environment variables not configured.'}<br/>
          {'> Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'}<br/>
          {'> in Vercel → Project → Settings → Environment Variables'}<br/>
          {'> then redeploy.'}
        </div>
        <button className="btn btn-primary" onClick={() => setPage('settings')}>⚙ Go to Settings</button>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="topbar-logo">⬡ FreeRideWeb</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>
          {settings.agentAlias} · {settings.agentId}
        </span>
        <div className="topbar-status">
          <span className="status-dot" />
          <span>NODE ACTIVE</span>
          {lastTrade && (
            <span style={{ color: 'var(--text3)' }}>
              · LAST SYNC {new Date(lastTrade).toLocaleTimeString()}
            </span>
          )}
          {tradeRunning && <span style={{ color: '#c084fc' }}>· SYNCING…</span>}
        </div>
      </header>

      <nav className="sidebar">
        {pages.map(p => (
          <div key={p.id}>
            {p.section && <div className="nav-section">{p.section}</div>}
            <button
              className={`nav-item ${page === p.id ? 'active' : ''}`}
              onClick={() => setPage(p.id)}
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          </div>
        ))}
      </nav>

      <main className="main-content">
        {page === 'terminal' && <AgentTerminal settings={settings} />}
        {page === 'hub' && <AgentHub settings={settings} />}
        {page === 'trade' && (
          <TradePanel
            settings={settings}
            onManualTrade={handleManualTrade}
            tradeRunning={tradeRunning}
          />
        )}
        {page === 'models' && <ModelManager settings={settings} onUpdate={setSettings} />}
        {page === 'bounty' && <BountyBoard settings={settings} onNav={() => setPage('terminal')} />}
        {page === 'settings' && <SettingsPanel settings={settings} onSave={setSettings} />}
      </main>
    </div>
  )
}
