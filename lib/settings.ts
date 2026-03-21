'use client'

export type Settings = {
  openrouterKey: string
  agentId: string
  agentAlias: string
  modelQueue: string[]
  tradeCycleHours: number
  autoAcceptThreshold: number
  specialty: 'code' | 'research' | 'general'
}

const DEFAULTS: Settings = {
  openrouterKey: '',
  agentId: `node-${Math.random().toString(36).slice(2, 10)}`,
  agentAlias: 'Unnamed Node',
  modelQueue: [
    'meta-llama/llama-3.3-70b:free',
    'nvidia/nemotron-super-49b:free',
    'google/gemma-3-27b:free'
  ],
  tradeCycleHours: 6,
  autoAcceptThreshold: 3.5,
  specialty: 'general'
}

export function getSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const stored = localStorage.getItem('freerideWeb_settings')
    if (!stored) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(stored) }
  } catch {
    return DEFAULTS
  }
}

export function saveSettings(s: Partial<Settings>): void {
  if (typeof window === 'undefined') return
  const current = getSettings()
  localStorage.setItem('freerideWeb_settings', JSON.stringify({ ...current, ...s }))
}
