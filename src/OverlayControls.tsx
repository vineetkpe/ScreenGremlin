import { useEffect, useState } from 'react'
import './overlay-controls.css'

function DesktopOverlayControls() {
  const [state, setState] = useState<ScreenGremlinState | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let mounted = true

    window.screenGremlin?.getState().then((next) => {
      if (mounted && next) setState(next)
    })

    const unsubscribe = window.screenGremlin?.onStateChanged((next) => {
      if (mounted) setState(next)
    })

    return () => {
      mounted = false
      unsubscribe?.()
    }
  }, [])

  if (!state || !window.screenGremlin) return null

  const settings = state.settings

  function update(patch: Partial<ScreenGremlinSettings>) {
    void window.screenGremlin?.updateSettings(patch)
  }

  function cycleIntensity() {
    const levels: ScreenGremlinIntensity[] = state.pro
      ? ['chill', 'normal', 'chaos']
      : ['chill', 'normal']
    const currentIndex = levels.indexOf(settings.intensity)
    const next = levels[(currentIndex + 1 + levels.length) % levels.length]
    update({ intensity: next })
  }

  return (
    <aside
      className={`overlay-controls ${settings.paused ? 'is-paused' : ''}`}
      aria-label="ScreenGremlin quick controls"
      onPointerEnter={() => window.screenGremlin?.setInteractive(true)}
      onPointerLeave={() => window.screenGremlin?.setInteractive(false)}
    >
      {expanded && (
        <div className="overlay-controls__panel">
          <button type="button" onClick={() => update({ speech: !settings.speech })}>
            <span>Speech</span>
            <strong>{settings.speech ? 'On' : 'Off'}</strong>
          </button>
          <button type="button" onClick={() => update({ notices: !settings.notices })}>
            <span>Notices</span>
            <strong>{settings.notices ? 'On' : 'Off'}</strong>
          </button>
          <button type="button" onClick={cycleIntensity}>
            <span>Speed</span>
            <strong>{settings.intensity}</strong>
          </button>
          <p>Shortcut: Ctrl/⌘ + Shift + G</p>
        </div>
      )}

      <div className="overlay-controls__dock">
        <button
          className="overlay-controls__pause"
          type="button"
          onClick={() => update({ paused: !settings.paused })}
        >
          <span aria-hidden="true">{settings.paused ? '▶' : 'Ⅱ'}</span>
          {settings.paused ? 'Resume Gremlin' : 'Pause Gremlin'}
        </button>
        <button
          className="overlay-controls__more"
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Close quick controls' : 'Open quick controls'}
        >
          {expanded ? '×' : '•••'}
        </button>
      </div>
    </aside>
  )
}

export default function OverlayControls() {
  const mode = new URLSearchParams(window.location.search).get('mode')

  if (mode !== 'overlay' || !window.screenGremlin) return null
  return <DesktopOverlayControls />
}
