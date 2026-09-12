import { useEffect, useState } from 'react'
import {
  ACCESSORIES,
  PERSONALITIES,
  isFocusActive,
  safeGremlinName,
  type Accessory,
  type GremlinSettings,
  type Personality,
} from './gremlin'
import useDesktopState from './useDesktopState'

function FeatureToggle({
  checked,
  disabled = false,
  title,
  description,
  badge,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  title: string
  description: string
  badge?: string
  onChange: (next: boolean) => void
}) {
  return (
    <label className={`fun-toggle ${disabled ? 'is-disabled' : ''}`}>
      <span>
        <strong>{title}{badge && <em>{badge}</em>}</strong>
        <small>{description}</small>
      </span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
    </label>
  )
}

export default function FunSettingsPanel() {
  const mode = new URLSearchParams(window.location.search).get('mode')
  const state = useDesktopState()
  const [nameDraft, setNameDraft] = useState('Gremlin')
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (state) setNameDraft(state.settings.name)
  }, [state?.settings.name])

  useEffect(() => {
    if (!state || !isFocusActive(state.settings, now)) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [now, state])

  if (mode !== 'settings' || !state || !window.screenGremlin) return null

  const settings = state.settings
  const focusActive = isFocusActive(settings, now)
  const remaining = focusActive && settings.focusUntil
    ? Math.max(1, Math.ceil((settings.focusUntil - now) / 60_000))
    : 0

  function update(patch: Partial<GremlinSettings>) {
    void window.screenGremlin?.updateSettings(patch)
  }

  function choosePersonality(personality: Personality) {
    const item = PERSONALITIES[personality]
    if (item.pro && !state?.pro) return
    update({ personality })
  }

  function chooseAccessory(accessory: Accessory) {
    const item = ACCESSORIES.find((candidate) => candidate.id === accessory)
    if (item?.pro && !state?.pro) return
    update({ accessory })
  }

  function saveName() {
    const name = safeGremlinName(nameDraft)
    setNameDraft(name)
    update({ name })
  }

  function startFocus(minutes: number) {
    update({ paused: false, focusUntil: Date.now() + minutes * 60_000 })
    setNow(Date.now())
  }

  return (
    <main className="fun-settings-shell">
      <section className="settings-card fun-settings-card">
        <header className="fun-settings-header">
          <div>
            <span className="settings-kicker">Fun Pack · lightweight</span>
            <h2>Make it yours.</h2>
            <p>All effects are local CSS, short timers, and tiny generated sounds. No AI model, microphone, or screen recording.</p>
          </div>
          <span className={state.pro ? 'pro-badge active' : 'pro-badge'}>{state.pro ? 'Pro active' : 'Free'}</span>
        </header>

        <div className="fun-block">
          <h3>Name your Gremlin</h3>
          <div className="name-editor">
            <input value={nameDraft} maxLength={24} onChange={(event) => setNameDraft(event.target.value)} onBlur={saveName} aria-label="Gremlin name" />
            <button type="button" onClick={saveName}>Save</button>
          </div>
        </div>

        <div className="fun-block">
          <h3>Personality packs</h3>
          <div className="personality-grid">
            {(Object.keys(PERSONALITIES) as Personality[]).map((personality) => {
              const item = PERSONALITIES[personality]
              const locked = item.pro && !state.pro
              return (
                <button
                  key={personality}
                  type="button"
                  disabled={locked}
                  className={settings.personality === personality ? 'active' : ''}
                  onClick={() => choosePersonality(personality)}
                >
                  <strong>{item.label}{locked ? ' · Pro' : ''}</strong>
                  <small>{item.description}</small>
                </button>
              )
            })}
          </div>
        </div>

        <div className="fun-block">
          <h3>Accessories</h3>
          <div className="accessory-grid">
            {ACCESSORIES.map((item) => {
              const locked = item.pro && !state.pro
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={locked}
                  className={settings.accessory === item.id ? 'active' : ''}
                  onClick={() => chooseAccessory(item.id)}
                >
                  <span className={`accessory-preview accessory-preview--${item.id}`} aria-hidden="true" />
                  {item.label}{locked ? ' · Pro' : ''}
                </button>
              )
            })}
          </div>
        </div>

        <div className="fun-block">
          <h3>Play & surprises</h3>
          <FeatureToggle checked={settings.sounds} title="Tiny sound reactions" description="Short synthesized pops only when you poke, throw, or give a toy. Off by default." onChange={(sounds) => update({ sounds })} />
          <FeatureToggle checked={settings.rareAnimations} title="Secret animations" description="Occasional dances, spins, trips, and personality-specific surprises." onChange={(rareAnimations) => update({ rareAnimations })} />
          <FeatureToggle checked={settings.duo && state.pro} disabled={!state.pro} title="Two Gremlins" badge={!state.pro ? 'PRO' : undefined} description="A second lightweight Gremlin joins the desktop. Capped at two for performance." onChange={(duo) => update({ duo })} />
          <p className="fun-note">Drag + throw is always enabled. Open the ••• dock on the desktop to give Ball or Pro Snack toys.</p>
        </div>

        <div className="fun-block">
          <h3>Work-safe controls</h3>
          <FeatureToggle checked={settings.fullscreenSafe} title="Fullscreen-safe mode" description="Stays out of native fullscreen spaces where the operating system supports it. Focus mode works everywhere." onChange={(fullscreenSafe) => update({ fullscreenSafe })} />
          <div className="focus-actions">
            {focusActive ? (
              <button type="button" className="focus-active" onClick={() => update({ focusUntil: null })}>End focus · about {remaining}m left</button>
            ) : (
              <>
                <button type="button" onClick={() => startFocus(30)}>Leave me alone · 30 min</button>
                <button type="button" onClick={() => startFocus(60)}>Leave me alone · 1 hour</button>
              </>
            )}
          </div>
        </div>

        <footer className="fun-settings-footer">
          <span>Idle work is timer-throttled to reduce CPU use.</span>
          <button type="button" onClick={() => void window.screenGremlin?.quitApp()}>Quit ScreenGremlin</button>
        </footer>
      </section>
    </main>
  )
}
