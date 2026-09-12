import { useEffect, useMemo, useState } from 'react'
import CompanionEffects from './CompanionEffects'
import CharacterArtV3 from './CharacterArtV3'
import DesktopCompanionV3 from './DesktopCompanionV3'
import { useCompanionPrefs, writeCompanionPrefs, type DangleEdge, type MovementMode } from './companion-store'
import { useCompanionV3Prefs, writeCompanionV3Prefs, type RopeLength } from './companion-v3-store'
import { DEFAULT_SETTINGS, PERSONALITIES, isFocusActive, type GremlinSettings } from './gremlin'
import useDesktopState from './useDesktopState'

type MenuPosition = { x: number; y: number } | null

function nearestEdge(x: number, y: number): DangleEdge {
  const edges: Array<[DangleEdge, number]> = [['left', x], ['right', 100 - x], ['top', y], ['bottom', 100 - y]]
  edges.sort((a, b) => a[1] - b[1])
  return edges[0][0]
}

function nextRopeLength(current: RopeLength): RopeLength {
  if (current === 'short') return 'medium'
  if (current === 'medium') return 'long'
  return 'short'
}

function SleepingCompanion({ focusActive }: { focusActive: boolean }) {
  const state = useDesktopState()
  const prefs = useCompanionPrefs()
  const settings = state?.settings ?? DEFAULT_SETTINGS
  const character = prefs.character === 'custom' && !state?.pro ? 'gremlin' : prefs.character
  return (
    <button
      className="gremlin companion-character companion-v3 character-sleeping-gremlin"
      type="button"
      aria-label={focusActive ? 'Companion is in focus mode. Click to wake.' : 'Companion is paused. Click to wake.'}
      onPointerEnter={() => window.screenGremlin?.setInteractive(true)}
      onPointerLeave={() => window.screenGremlin?.setInteractive(false)}
      onClick={() => {
        if (focusActive) void window.screenGremlin?.updateSettings({ focusUntil: null })
        else void window.screenGremlin?.updateSettings({ paused: false })
      }}
    >
      <span className="companion-speech v3-speech">{focusActive ? 'focus mode.' : 'zzz…'}</span>
      <CharacterArtV3
        character={character}
        expression="sleepy"
        accessory={settings.accessory}
        customPrimary={prefs.customPrimary}
        customSecondary={prefs.customSecondary}
        customShape={prefs.customShape}
        customEyes={prefs.customEyes}
      />
    </button>
  )
}

export default function DesktopOverlayShell() {
  const state = useDesktopState()
  const settings = state?.settings ?? DEFAULT_SETTINGS
  const prefs = useCompanionPrefs()
  const v3 = useCompanionV3Prefs()
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
      if (!target.closest('.companion-character')) return
      event.preventDefault()
      event.stopPropagation()
      window.screenGremlin?.setInteractive(true)
      setMenuPosition({ x: event.clientX, y: event.clientY })
    }
    const openFriend = (event: Event) => {
      const custom = event as CustomEvent<{ x?: number; y?: number }>
      const x = Number(custom.detail?.x)
      const y = Number(custom.detail?.y)
      if (!Number.isFinite(x) || !Number.isFinite(y)) return
      void window.screenGremlin?.openFriend({ x, y })
      window.setTimeout(() => window.screenGremlin?.setInteractive(false), 100)
    }
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') closeMenu() }
    document.addEventListener('contextmenu', openMenu, true)
    window.addEventListener('screen-gremlin:quick-open', openFriend as EventListener)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('contextmenu', openMenu, true)
      window.removeEventListener('screen-gremlin:quick-open', openFriend as EventListener)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const menuStyle = useMemo(() => {
    if (!menuPosition) return undefined
    const width = 248
    const height = 590
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
    if (mode === 'dangle') {
      writeCompanionPrefs({ movementMode: mode, dangleEdge: nearestEdge(prefs.lastX, prefs.lastY) })
      writeCompanionV3Prefs({ ropeEnabled: true })
    } else {
      writeCompanionPrefs({ movementMode: mode })
    }
    closeMenu()
  }

  function openFriend() {
    const x = menuPosition?.x ?? window.innerWidth / 2
    const y = menuPosition?.y ?? window.innerHeight / 2
    closeMenu()
    void window.screenGremlin?.openFriend({ x, y })
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
      <CompanionEffects />
      {!asleep && <DesktopCompanionV3 />}
      {asleep && <SleepingCompanion focusActive={focusActive} />}

      {menuPosition && (
        <aside className="character-context-menu" style={menuStyle} role="menu" aria-label="ScreenGremlin character menu" onPointerEnter={() => window.screenGremlin?.setInteractive(true)} onContextMenu={(event) => event.preventDefault()}>
          <header><strong>{settings.name}</strong><span>{PERSONALITIES[settings.personality].label} · {prefs.movementMode}</span></header>
          <button type="button" role="menuitem" onClick={openFriend}><span>Talk / quick actions</span><small>Chat, todo, note, reminder</small></button>
          <button type="button" role="menuitem" onClick={openDashboard}><span>Customize</span><small>Character, personality & Pro</small></button>
          <div className="character-context-menu__separator" />
          <button type="button" role="menuitem" className={prefs.movementMode === 'free' ? 'is-active' : ''} onClick={() => movement('free')}><span>Roam</span><small>Walk, perch and explore</small></button>
          <button type="button" role="menuitem" className={prefs.movementMode === 'parked' ? 'is-active' : ''} onClick={() => movement('parked')}><span>Park exactly here</span><small>Stay at the precise drop point</small></button>
          <button type="button" role="menuitem" className={prefs.movementMode === 'dangle' ? 'is-active' : ''} onClick={() => movement('dangle')}><span>Dangle with rope</span><small>Hang where you dragged me</small></button>
          {prefs.movementMode === 'dangle' && <>
            <button type="button" role="menuitem" onClick={() => { writeCompanionV3Prefs({ ropeEnabled: !v3.ropeEnabled }); closeMenu() }}><span>Rope</span><small>{v3.ropeEnabled ? 'Visible' : 'Hidden'}</small></button>
            <button type="button" role="menuitem" onClick={() => { writeCompanionV3Prefs({ ropeLength: nextRopeLength(v3.ropeLength) }); closeMenu() }}><span>Rope length</span><small>{v3.ropeLength} · click to cycle</small></button>
            <button type="button" role="menuitem" onClick={() => { writeCompanionV3Prefs({ ropeStyle: v3.ropeStyle === 'cord' ? 'chain' : 'cord' }); closeMenu() }}><span>Rope style</span><small>{v3.ropeStyle}</small></button>
          </>}
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