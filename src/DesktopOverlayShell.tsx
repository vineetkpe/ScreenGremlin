import { useEffect, useMemo, useState } from 'react'
import DesktopCompanionV2 from './DesktopCompanionV2'
import { useCompanionPrefs, writeCompanionPrefs, type DangleEdge, type MovementMode } from './companion-store'
import { DEFAULT_SETTINGS, PERSONALITIES, isFocusActive, type GremlinSettings } from './gremlin'
import useDesktopState from './useDesktopState'

type MenuPosition = { x: number; y: number } | null

function nearestEdge(x: number, y: number): DangleEdge {
  const edges: Array<[DangleEdge, number]> = [['left', x], ['right', 100 - x], ['top', y], ['bottom', 100 - y]]
  edges.sort((a, b) => a[1] - b[1])
  return edges[0][0]
}

function SleepingGremlin({ focusActive }: { focusActive: boolean }) {
  return (
    <button
      className="gremlin gremlin--nap character-sleeping-gremlin"
      type="button"
      aria-label={focusActive ? 'ScreenGremlin is in focus mode. Right-click for options.' : 'ScreenGremlin is paused. Right-click for options.'}
      onPointerEnter={() => window.screenGremlin?.setInteractive(true)}
      onPointerLeave={() => window.screenGremlin?.setInteractive(false)}
      onClick={() => {
        if (focusActive) void window.screenGremlin?.updateSettings({ focusUntil: null })
        else void window.screenGremlin?.updateSettings({ paused: false })
      }}
    >
      <span className="speech-bubble">{focusActive ? 'focus mode.' : 'paused.'}</span>
      <span className="ear ear--left" aria-hidden="true" />
      <span className="ear ear--right" aria-hidden="true" />
      <span className="gremlin-body" aria-hidden="true">
        <span className="brow brow--left" />
        <span className="brow brow--right" />
        <span className="eye eye--left" />
        <span className="eye eye--right" />
        <span className="mouth" />
        <span className="sleep-mark">z</span>
      </span>
    </button>
  )
}

export default function DesktopOverlayShell() {
  const state = useDesktopState()
  const settings = state?.settings ?? DEFAULT_SETTINGS
  const prefs = useCompanionPrefs()
  const [menuPosition, setMenuPosition] = useState<MenuPosition>(null)
  const [now, setNow] = useState(Date.now())
  const focusActive = isFocusActive(settings, now)
  const asleep = settings.paused || focusActive

  useEffect(() => {
    if (!focusActive) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [focusActive])

  useEffect(() => {
    if (settings.focusUntil && settings.focusUntil <= now) void window.screenGremlin?.updateSettings({ focusUntil: null })
  }, [now, settings.focusUntil])

  useEffect(() => {
    const openMenu = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('.character-context-menu')) return
      if (!target.closest('.gremlin')) return
      event.preventDefault()
      event.stopPropagation()
      window.screenGremlin?.setInteractive(true)
      setMenuPosition({ x: event.clientX, y: event.clientY })
    }
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') closeMenu() }
    document.addEventListener('contextmenu', openMenu, true)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('contextmenu', openMenu, true)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const menuStyle = useMemo(() => {
    if (!menuPosition) return undefined
    const width = 236
    const height = 470
    return {
      left: Math.max(10, Math.min(menuPosition.x, window.innerWidth - width - 10)),
      top: Math.max(10, Math.min(menuPosition.y, window.innerHeight - height - 10)),
    }
  }, [menuPosition])

  function closeMenu() {
    setMenuPosition(null)
    window.setTimeout(() => window.screenGremlin?.setInteractive(false), 80)
  }

  function update(patch: Partial<GremlinSettings>) {
    void window.screenGremlin?.updateSettings(patch)
    closeMenu()
  }

  function movement(mode: MovementMode) {
    if (mode === 'dangle') writeCompanionPrefs({ movementMode: mode, dangleEdge: nearestEdge(prefs.lastX, prefs.lastY) })
    else writeCompanionPrefs({ movementMode: mode })
    closeMenu()
  }

  function openDashboard() {
    void window.screenGremlin?.openSettings()
    closeMenu()
  }

  function startFocus(minutes: number) {
    update({ paused: false, focusUntil: Date.now() + minutes * 60_000 })
    setNow(Date.now())
  }

  return (
    <>
      {!asleep && <DesktopCompanionV2 />}
      {asleep && <SleepingGremlin focusActive={focusActive} />}

      {menuPosition && (
        <aside
          className="character-context-menu"
          style={menuStyle}
          role="menu"
          aria-label="ScreenGremlin character menu"
          onPointerEnter={() => window.screenGremlin?.setInteractive(true)}
          onPointerLeave={() => closeMenu()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <header><strong>{settings.name}</strong><span>{PERSONALITIES[settings.personality].label} · {prefs.movementMode}</span></header>
          <button type="button" role="menuitem" onClick={openDashboard}><span>Dashboard</span><small>Character, productivity & Pro</small></button>
          <button type="button" role="menuitem" onClick={openDashboard}><span>Customize</span><small>Original characters & expressions</small></button>
          <div className="character-context-menu__separator" />
          <button type="button" role="menuitem" className={prefs.movementMode === 'free' ? 'is-active' : ''} onClick={() => movement('free')}><span>Roam freely</span><small>Move around the desktop</small></button>
          <button type="button" role="menuitem" className={prefs.movementMode === 'parked' ? 'is-active' : ''} onClick={() => movement('parked')}><span>Park here</span><small>Stay where I dragged you</small></button>
          <button type="button" role="menuitem" className={prefs.movementMode === 'dangle' ? 'is-active' : ''} onClick={() => movement('dangle')}><span>Dangle / Hang</span><small>Snap to the nearest screen edge</small></button>
          <div className="character-context-menu__separator" />
          <button type="button" role="menuitem" onClick={() => focusActive ? update({ focusUntil: null }) : update({ paused: !settings.paused })}><span>{focusActive ? 'End Focus' : settings.paused ? 'Resume' : 'Pause'}</span><small>{focusActive ? 'Wake the companion' : settings.paused ? 'Start moving again' : 'Stay quiet'}</small></button>
          {!focusActive && !settings.paused && <button type="button" role="menuitem" onClick={() => startFocus(30)}><span>Focus 30 min</span><small>Quiet while you work</small></button>}
          <button type="button" role="menuitem" onClick={() => update({ sounds: !settings.sounds })}><span>Sounds</span><small>{settings.sounds ? 'On' : 'Off'}</small></button>
          <div className="character-context-menu__separator" />
          <button type="button" role="menuitem" className="character-context-menu__danger" onClick={() => { closeMenu(); void window.screenGremlin?.quitApp() }}><span>Quit ScreenGremlin</span><small>Close completely</small></button>
        </aside>
      )}
    </>
  )
}
