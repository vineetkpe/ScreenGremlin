import { useEffect, useState } from 'react'

export type RopeLength = 'short' | 'medium' | 'long'
export type RopeStyle = 'cord' | 'chain'

export type CompanionV3Prefs = {
  ropeEnabled: boolean
  ropeLength: RopeLength
  ropeStyle: RopeStyle
  quickPanelHints: boolean
}

const KEY = 'screen-gremlin:companion-v3:v1'
const EVENT = 'screen-gremlin:companion-v3'

export const DEFAULT_V3_PREFS: CompanionV3Prefs = {
  ropeEnabled: true,
  ropeLength: 'medium',
  ropeStyle: 'cord',
  quickPanelHints: true,
}

function readRaw(): Partial<CompanionV3Prefs> {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) as Partial<CompanionV3Prefs> : {}
  } catch {
    return {}
  }
}

export function readCompanionV3Prefs(): CompanionV3Prefs {
  const raw = readRaw()
  return {
    ropeEnabled: typeof raw.ropeEnabled === 'boolean' ? raw.ropeEnabled : DEFAULT_V3_PREFS.ropeEnabled,
    ropeLength: ['short', 'medium', 'long'].includes(String(raw.ropeLength)) ? raw.ropeLength as RopeLength : DEFAULT_V3_PREFS.ropeLength,
    ropeStyle: ['cord', 'chain'].includes(String(raw.ropeStyle)) ? raw.ropeStyle as RopeStyle : DEFAULT_V3_PREFS.ropeStyle,
    quickPanelHints: typeof raw.quickPanelHints === 'boolean' ? raw.quickPanelHints : DEFAULT_V3_PREFS.quickPanelHints,
  }
}

export function writeCompanionV3Prefs(patch: Partial<CompanionV3Prefs>) {
  const next = { ...readCompanionV3Prefs(), ...patch }
  localStorage.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent(EVENT))
  return next
}

export function ropePixels(length: RopeLength) {
  if (length === 'short') return 64
  if (length === 'long') return 176
  return 112
}

export function useCompanionV3Prefs() {
  const [prefs, setPrefs] = useState(readCompanionV3Prefs)
  useEffect(() => {
    const refresh = () => setPrefs(readCompanionV3Prefs())
    window.addEventListener(EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  return prefs
}
