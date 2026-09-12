import { type CSSProperties, useEffect, useState } from 'react'
import DesktopOverlay from './DesktopOverlay'
import {
  ACCESSORIES,
  DEFAULT_SETTINGS,
  PERSONALITIES,
  isFocusActive,
  safeGremlinName,
  themeColors,
  type Accessory,
  type GremlinSettings,
  type Intensity,
  type Personality,
  type Theme,
} from './gremlin'
import useDesktopState from './useDesktopState'

function Toggle({
  checked,
  disabled = false,
  label,
  description,
  badge,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  description: string
  badge?: string
  onChange: (next: boolean) => void
}) {
  return (
    <label className={`setting-row ${disabled ? 'is-disabled' : ''}`}>
      <span>
        <strong>{label}{badge && <em className="setting-badge">{badge}</em>}</strong>
        <small>{description}</small>
      </span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
    </label>
  )
}

function SettingsView() {
  const state = useDesktopState()
  const [licenseKey, setLicenseKey] = useState('')
  const [licenseMessage, setLicenseMessage] = useState('')
  const [nameDraft, setNameDraft] = useState(DEFAULT_SETTINGS.name)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (state) setNameDraft(state.settings.name)
  }, [state?.settings.name])

  useEffect(() => {
    if (!state || !isFocusActive(state.settings, now)) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [now, state])

  if (!window.screenGremlin) {
    return (
      <main className="settings-shell">
        <div className="settings-card"><h1>Open ScreenGremlin as the desktop app to use settings.</h1></div>
      </main>
    )
  }

  if (!state) {
    return <main className="settings-shell"><div className="settings-card"><p>Loading ScreenGremlin…</p></div></main>
  }

  const settings = state.settings
  const focusActive = isFocusActive(settings, now)
  const focusMinutes = focusActive && settings.focusUntil
    ? Math.max(1, Math.ceil((settings.focusUntil - now) / 60_000))
    : 0

  const update = (patch: Partial<GremlinSettings>) => {
    void window.screenGremlin?.updateSettings(patch)
  }

  function saveName() {
    const next = safeGremlinName(nameDraft)
    setNameDraft(next)
    update({ name: next })
  }

  function choosePersonality(personality: Personality) {
    if (PERSONALITIES[personality].pro && !state?.pro) return
    update({ personality })
  }

  function chooseAccessory(accessory: Accessory) {
    const item = ACCESSORIES.find((candidate) => candidate.id === accessory)
    if (item?.pro && !state?.pro) return
    update({ accessory })
  }

  function startFocus(minutes: number) {
    update({ paused: false, focusUntil: Date.now() + minutes * 60_000 })
    setNow(Date.now())
  }

  async function activateLicense() {
    setLicenseMessage('Checking key…')
    const result = await window.screenGremlin?.activateLicense(licenseKey)
    if (!result?.valid) {
      setLicenseMessage(result?.error || 'License could not be activated.')
      return
    }
    setLicenseKey('')
    setLicenseMessage('Pro unlocked.')
  }

  async function openUrl(url: string) {
    if (url) await window.screenGremlin?.openExternal(url)
  }

  return (
    <main className="settings-shell">
      <section className="settings-card">
        <header className="settings-header">
          <div>
            <span className="settings-kicker">ScreenGremlin {state.appVersion}</span>
            <h1>Control the menace.</h1>
            <p className="settings-intro">Lightweight personality, toys, drag-and-throw, focus controls, and optional Pro chaos.</p>
          </div>
          <button className="icon-button" type="button" onClick={() => void window.screenGremlin?.closeSettings()} aria-label="Close settings">×</button>
        </header>

        <button
          className={`pause-button ${settings.paused || focusActive ? 'is-paused' : ''}`}
          type="button"
          onClick={() => focusActive ? update({ focusUntil: null }) : update({ paused: !settings.paused })}
        >
          <span>{focusActive ? `End Focus · ${focusMinutes}m left` : settings.paused ? 'Resume Gremlin' : 'Pause Gremlin'}</span>
          <kbd>Ctrl/⌘ + Shift + G</kbd>
        </button>

        <div className="settings-section">
          <h2>Name</h2>
          <div className="name-editor">
            <input value={nameDraft} maxLength={24} onChange={(event) => setNameDraft(event.target.value)} onBlur={saveName} aria-label="Gremlin name" />
            <button type="button" onClick={saveName}>Save</button>
          </div>
        </div>

        <div className="settings-section">
          <h2>Personality pack</h2>
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

        <div className="settings-section">
          <h2>Look & intensity</h2>
          <div className="segmented">
            {(['chill', 'normal', 'chaos'] as Intensity[]).map((intensity) => {
              const locked = intensity === 'chaos' && !state.pro
              return (
                <button key={intensity} type="button" disabled={locked} className={settings.intensity === intensity ? 'active' : ''} onClick={() => update({ intensity })}>
                  {intensity}{locked ? ' · Pro' : ''}
                </button>
              )
            })}
          </div>

          <div className="theme-grid">
            {(Object.keys(themeColors) as Theme[]).map((theme) => {
              const locked = theme !== 'lime' && !state.pro
              return (
                <button
                  key={theme}
                  type="button"
                  className={`theme-swatch ${settings.theme === theme ? 'active' : ''}`}
                  disabled={locked}
                  onClick={() => update({ theme })}
                  style={{ '--swatch': themeColors[theme] } as CSSProperties}
                >
                  <span />{theme}{locked ? ' · Pro' : ''}
                </button>
              )
            })}
          </div>

          <div className="accessory-grid">
            {ACCESSORIES.map((item) => {
              const locked = item.pro && !state.pro
              return (
                <button key={item.id} type="button" disabled={locked} className={settings.accessory === item.id ? 'active' : ''} onClick={() => chooseAccessory(item.id)}>
                  <span className={`accessory-preview accessory-preview--${item.id}`} aria-hidden="true" />
                  {item.label}{locked ? ' · Pro' : ''}
                </button>
              )
            })}
          </div>
        </div>

        <div className="settings-section">
          <h2>Fun</h2>
          <Toggle checked={settings.speech} label="Speech bubbles" description="Let the Gremlin talk back." onChange={(speech) => update({ speech })} />
          <Toggle checked={settings.notices} label="Mischief notices" description="Occasional tiny fake status messages." onChange={(notices) => update({ notices })} />
          <Toggle checked={settings.sounds} label="Tiny sound reactions" description="Short synthesized sounds only on interaction. Off by default." onChange={(sounds) => update({ sounds })} />
          <Toggle checked={settings.rareAnimations} label="Secret animations" description="Occasional dances, spins, trips, naps, and personality surprises." onChange={(rareAnimations) => update({ rareAnimations })} />
          <Toggle checked={settings.duo && state.pro} disabled={!state.pro} badge={!state.pro ? 'PRO' : undefined} label="Two Gremlins" description="Adds one extra Gremlin. Hard-capped at two to stay lightweight." onChange={(duo) => update({ duo })} />
          <p className="config-note">Drag and throw works automatically. Use the desktop ••• menu for Ball and Pro Snack toys.</p>
        </div>

        <div className="settings-section">
          <h2>Work-safe</h2>
          <div className="focus-actions">
            {focusActive ? (
              <button type="button" className="focus-active" onClick={() => update({ focusUntil: null })}>End focus · about {focusMinutes}m left</button>
            ) : (
              <>
                <button type="button" onClick={() => startFocus(30)}>Leave me alone · 30 min</button>
                <button type="button" onClick={() => startFocus(60)}>Leave me alone · 1 hour</button>
              </>
            )}
          </div>
          <Toggle checked={settings.fullscreenSafe} label="Fullscreen-safe mode" description="Avoid native fullscreen spaces where supported. Focus mode is the universal fallback." onChange={(fullscreenSafe) => update({ fullscreenSafe })} />
          <Toggle checked={settings.allDisplays} label="All displays" description="Let a Gremlin loose on every monitor." onChange={(allDisplays) => update({ allDisplays })} />
          <Toggle checked={settings.alwaysOnTop} label="Stay on top" description="Keep the Gremlin above normal app windows." onChange={(alwaysOnTop) => update({ alwaysOnTop })} />
          <Toggle checked={settings.startAtLogin} label="Start at login" description="Launch ScreenGremlin when you sign in." onChange={(startAtLogin) => update({ startAtLogin })} />
        </div>

        <div className="settings-section license-panel">
          <div className="license-heading">
            <div>
              <h2>ScreenGremlin Pro</h2>
              <p>Chaos mode, premium personalities, accessories, snack toy, duo mode, and extra colors.</p>
            </div>
            <span className={state.pro ? 'pro-badge active' : 'pro-badge'}>{state.pro ? 'Unlocked' : `$${state.priceUsd}`}</span>
          </div>

          {state.pro ? (
            <div className="license-active">
              <p>Licensed to <strong>{state.license?.owner || 'Developer mode'}</strong></p>
              {state.license && <button className="text-button" type="button" onClick={() => void window.screenGremlin?.deactivateLicense()}>Deactivate license</button>}
            </div>
          ) : (
            <>
              <div className="license-entry">
                <input value={licenseKey} onChange={(event) => setLicenseKey(event.target.value)} placeholder="SG1.…" aria-label="ScreenGremlin license key" />
                <button type="button" onClick={activateLicense}>Unlock</button>
              </div>
              {licenseMessage && <p className="license-message">{licenseMessage}</p>}
              <div className="purchase-actions">
                <button type="button" className="primary-button" disabled={!state.checkoutUrl} onClick={() => void openUrl(state.checkoutUrl)}>Buy Pro · ${state.priceUsd}</button>
                {state.creatorUnlockUrl && <button type="button" className="secondary-button" onClick={() => void openUrl(state.creatorUnlockUrl)}>Creator unlock</button>}
              </div>
              {!state.checkoutUrl && <p className="config-note">Checkout is not connected in this development build.</p>}
            </>
          )}
        </div>

        <footer className="settings-footer settings-footer--actions">
          <span>No analytics · no account · no screen recording</span>
          <button type="button" onClick={() => void window.screenGremlin?.quitApp()}>Quit ScreenGremlin</button>
        </footer>
      </section>
    </main>
  )
}

function DemoGremlin() {
  const [quote, setQuote] = useState('drag me. i dare you.')
  const lines = ['tiny menace.', 'side quest unlocked.', 'that meeting could be an email.', 'boop accepted.', 'i live here now.']
  return (
    <button type="button" className="landing-demo-gremlin" onClick={() => setQuote(lines[Math.floor(Math.random() * lines.length)])} aria-label="Poke the demo Gremlin">
      <span className="demo-speech">{quote}</span>
      <span className="demo-ear demo-ear--left" />
      <span className="demo-ear demo-ear--right" />
      <span className="demo-body"><span className="demo-eye demo-eye--left" /><span className="demo-eye demo-eye--right" /><span className="demo-mouth" /></span>
    </button>
  )
}

function LandingPage() {
  const checkoutUrl = import.meta.env.VITE_CHECKOUT_URL || ''
  const downloadUrl = 'https://github.com/vineetkpe/ScreenGremlin/releases/latest'

  return (
    <main className="landing">
      <nav className="landing-nav">
        <a className="wordmark" href="#top">ScreenGremlin</a>
        <div><a href="#features">Features</a><a href="#pricing">Pricing</a><a className="nav-download" href={downloadUrl}>Download</a></div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="hero-kicker">A tiny menace for your desktop.</p>
          <h1>Your screen has a personality problem.</h1>
          <p className="hero-subtitle">Drag it. Throw it. Name it. Give it toys. Pick a personality. Then tell it to leave you alone when work actually matters.</p>
          <div className="hero-actions">
            <a className="primary-cta" href={downloadUrl}>Download free</a>
            <a className={`secondary-cta ${checkoutUrl ? '' : 'is-disabled'}`} href={checkoutUrl || '#pricing'}>Pro · $2.99</a>
          </div>
          <p className="hero-meta">Windows, macOS & Linux · no account · no analytics · lightweight idle behavior</p>
        </div>
        <div className="hero-stage" aria-label="Interactive ScreenGremlin demo">
          <div className="fake-window"><div className="fake-titlebar"><span /><span /><span /></div><div className="fake-lines"><i /><i /><i /><i /></div></div>
          <DemoGremlin /><p className="demo-hint">poke it</p>
        </div>
      </section>

      <section className="feature-section" id="features">
        <p className="section-kicker">More personality. Almost no baggage.</p>
        <h2>Built to be fun without becoming another heavy desktop app.</h2>
        <div className="feature-grid">
          <article><span>01</span><h3>Drag + throw</h3><p>Grab the Gremlin, fling it across the desktop, and watch it bounce and react.</p></article>
          <article><span>02</span><h3>Personality packs</h3><p>Cute, Office, Savage, Lazy, Chaotic, and Gamer personalities change its chatter and behavior.</p></article>
          <article><span>03</span><h3>Skins + toys</h3><p>Caps, glasses, headphones, crowns, a ball, snacks, secret animations, and optional duo mode.</p></article>
          <article><span>04</span><h3>Work-safe</h3><p>Pause instantly, start a 30/60 minute focus timer, and use fullscreen-safe behavior where supported.</p></article>
        </div>
      </section>

      <section className="pricing-section" id="pricing">
        <div><p className="section-kicker">Impulse-buy sized.</p><h2>Try the roommate free. Unlock the full personality for $2.99.</h2></div>
        <div className="price-cards">
          <article className="price-card"><span>Free</span><strong>$0</strong><p>Core Gremlin, drag + throw, two personalities, cap, ball toy, focus mode, secret animations.</p><a href={downloadUrl}>Download</a></article>
          <article className="price-card featured"><span>Pro</span><strong>$2.99</strong><p>Chaos, premium personalities, colors, accessories, snack toy, duo mode, and future packs.</p><a className={checkoutUrl ? '' : 'is-disabled'} href={checkoutUrl || '#pricing'}>{checkoutUrl ? 'Buy Pro' : 'Checkout connects at launch'}</a></article>
        </div>
      </section>

      <section className="faq-section">
        <h2>Before the Gremlin moves in.</h2>
        <details><summary>Will it slow my PC?</summary><p>The fun pack uses short CSS animations and timers, and background work is throttled. It does not run an AI model, record your screen, or listen to your microphone.</p></details>
        <details><summary>Can I stop it immediately?</summary><p>Yes. Use the always-visible Pause button, Ctrl/⌘ + Shift + G, a focus timer, or Quit from the quick menu.</p></details>
        <details><summary>Does Pro require an account?</summary><p>No. ScreenGremlin uses an offline signed license key.</p></details>
      </section>

      <footer className="landing-footer"><span>ScreenGremlin</span><span>A tiny problem for your desktop.</span></footer>
    </main>
  )
}

export default function App() {
  const mode = new URLSearchParams(window.location.search).get('mode')
  if (mode === 'overlay') return <DesktopOverlay />
  if (mode === 'settings') return <SettingsView />
  return <LandingPage />
}
