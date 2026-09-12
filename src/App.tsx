import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

type Intensity = 'chill' | 'normal' | 'chaos'
type Theme = 'lime' | 'pink' | 'ice' | 'purple'
type Behavior = 'idle' | 'wander' | 'peek' | 'taunt' | 'caught' | 'nap' | 'zoom'

type GremlinSettings = {
  paused: boolean
  intensity: Intensity
  speech: boolean
  notices: boolean
  theme: Theme
  startAtLogin: boolean
  allDisplays: boolean
  alwaysOnTop: boolean
}

type LicenseInfo = {
  id: string
  owner: string
  tier: 'pro'
  issuedAt: string | null
  expiresAt: string | null
}

type AppState = {
  settings: GremlinSettings
  pro: boolean
  license: LicenseInfo | null
  appVersion: string
  platform: string
  checkoutUrl: string
  priceUsd: string
  downloadUrl: string
  creatorUnlockUrl: string
}

type Position = {
  x: number
  y: number
}

const DEFAULT_SETTINGS: GremlinSettings = {
  paused: false,
  intensity: 'normal',
  speech: true,
  notices: true,
  theme: 'lime',
  startAtLogin: false,
  allDisplays: true,
  alwaysOnTop: true,
}

const themeColors: Record<Theme, string> = {
  lime: '#b2ff59',
  pink: '#ff7ad9',
  ice: '#79e6ff',
  purple: '#b69cff',
}

const reactions = [
  'hey. rude.',
  'you found me.',
  'stop poking me.',
  'i live here now.',
  'your screen tastes expensive.',
  'that was personal.',
  'i am contacting HR.',
  'this will be in my report.',
]

const taunts = [
  'working hard or hardly buffering?',
  'i saw that tab you closed.',
  'your desktop needs supervision.',
  'productivity detected. fixing that.',
  'nice spreadsheet. shame if someone judged it.',
  'you have 37 tabs. i counted.',
]

const notices = [
  'Gremlin inspected your productivity.',
  'One suspicious pixel has been relocated.',
  'Gremlin claims this corner now.',
  'Nothing was broken. Probably.',
  'A meeting could have been an email.',
]

function randomPosition(): Position {
  return {
    x: 9 + Math.random() * 76,
    y: 15 + Math.random() * 68,
  }
}

function edgePosition(): Position {
  const side = Math.random() > 0.5 ? 'left' : 'right'
  return {
    x: side === 'left' ? 2.5 : 97.5,
    y: 22 + Math.random() * 56,
  }
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function useDesktopState() {
  const [state, setState] = useState<AppState | null>(null)

  useEffect(() => {
    if (!window.screenGremlin) return

    let mounted = true
    window.screenGremlin.getState().then((next) => {
      if (mounted && next) setState(next)
    })

    const unsubscribe = window.screenGremlin.onStateChanged((next) => {
      if (mounted && next) setState(next)
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  return state
}

function GremlinFace({
  behavior,
  speech,
  showSpeech,
}: {
  behavior: Behavior
  speech: string
  showSpeech: boolean
}) {
  return (
    <>
      {showSpeech && <span className="speech-bubble">{speech}</span>}
      <span className="ear ear--left" aria-hidden="true" />
      <span className="ear ear--right" aria-hidden="true" />
      <span className="gremlin-body" aria-hidden="true">
        <span className="brow brow--left" />
        <span className="brow brow--right" />
        <span className="eye eye--left" />
        <span className="eye eye--right" />
        <span className="mouth" />
        {behavior === 'nap' && <span className="sleep-mark">z</span>}
      </span>
    </>
  )
}

function Overlay() {
  const state = useDesktopState()
  const settings = state?.settings ?? DEFAULT_SETTINGS
  const [position, setPosition] = useState<Position>({ x: 70, y: 58 })
  const [behavior, setBehavior] = useState<Behavior>('idle')
  const [reactionIndex, setReactionIndex] = useState(0)
  const [pokeCount, setPokeCount] = useState(0)
  const [speech, setSpeech] = useState(reactions[0])
  const [notice, setNotice] = useState<string | null>(null)
  const noticeTimeout = useRef<number | null>(null)
  const behaviorTimeout = useRef<number | null>(null)

  const intervalMs = useMemo(() => {
    if (settings.intensity === 'chill') return 6200
    if (settings.intensity === 'chaos') return 1900
    return 3300
  }, [settings.intensity])

  useEffect(() => {
    if (settings.paused) return

    const clearBehaviorTimeout = () => {
      if (behaviorTimeout.current !== null) {
        window.clearTimeout(behaviorTimeout.current)
      }
    }

    const showNotice = (text: string) => {
      if (!settings.notices) return
      setNotice(text)

      if (noticeTimeout.current !== null) {
        window.clearTimeout(noticeTimeout.current)
      }

      noticeTimeout.current = window.setTimeout(() => setNotice(null), 1900)
    }

    const performMischief = () => {
      clearBehaviorTimeout()
      const roll = Math.random()

      if (settings.intensity === 'chill' && roll > 0.72) {
        setBehavior('nap')
        setPosition(randomPosition())
        setSpeech('five minute break.')
        behaviorTimeout.current = window.setTimeout(() => setBehavior('idle'), 2100)
        return
      }

      if (settings.intensity === 'chaos' && roll > 0.78) {
        setBehavior('zoom')
        setPosition(randomPosition())
        setSpeech('catch me.')
        showNotice(randomItem(notices))
        behaviorTimeout.current = window.setTimeout(() => setBehavior('idle'), 850)
        return
      }

      if (roll < 0.5) {
        setBehavior('wander')
        setPosition(randomPosition())
        behaviorTimeout.current = window.setTimeout(() => setBehavior('idle'), 1150)
        return
      }

      if (roll < 0.75) {
        setBehavior('peek')
        setPosition(edgePosition())
        setSpeech('just checking something...')
        behaviorTimeout.current = window.setTimeout(() => setBehavior('idle'), 1600)
        return
      }

      setBehavior('taunt')
      setPosition(randomPosition())
      setSpeech(randomItem(taunts))
      showNotice(randomItem(notices))
      behaviorTimeout.current = window.setTimeout(() => setBehavior('idle'), 1400)
    }

    const timer = window.setInterval(performMischief, intervalMs)

    return () => {
      window.clearInterval(timer)
      clearBehaviorTimeout()

      if (noticeTimeout.current !== null) {
        window.clearTimeout(noticeTimeout.current)
      }
    }
  }, [intervalMs, settings.notices, settings.paused, settings.intensity])

  function pokeGremlin() {
    const nextReactionIndex = reactionIndex + 1
    const nextPokeCount = pokeCount + 1

    setReactionIndex(nextReactionIndex)
    setPokeCount(nextPokeCount)
    setBehavior('caught')
    setSpeech(reactions[nextReactionIndex % reactions.length])
    setPosition(randomPosition())

    if (behaviorTimeout.current !== null) {
      window.clearTimeout(behaviorTimeout.current)
    }

    behaviorTimeout.current = window.setTimeout(() => setBehavior('idle'), 700)

    if (settings.notices && nextPokeCount % 3 === 0) {
      setNotice(`Poke #${nextPokeCount}: Gremlin is taking notes.`)

      if (noticeTimeout.current !== null) {
        window.clearTimeout(noticeTimeout.current)
      }

      noticeTimeout.current = window.setTimeout(() => setNotice(null), 1900)
    }
  }

  if (settings.paused) return null

  const rootStyle = {
    '--gremlin-accent': themeColors[settings.theme],
  } as CSSProperties

  return (
    <main
      className={`overlay-root overlay-root--${behavior}`}
      style={rootStyle}
      aria-label="ScreenGremlin desktop overlay"
    >
      {notice && (
        <aside className="gremlin-notice" role="status">
          <span className="gremlin-notice__dot" aria-hidden="true" />
          {notice}
        </aside>
      )}

      <button
        className={`gremlin gremlin--${behavior}`}
        style={{ left: `${position.x}%`, top: `${position.y}%` }}
        onPointerEnter={() => window.screenGremlin?.setInteractive(true)}
        onPointerLeave={() => window.screenGremlin?.setInteractive(false)}
        onClick={pokeGremlin}
        aria-label={`Poke the ScreenGremlin. Poked ${pokeCount} times.`}
        type="button"
      >
        <GremlinFace
          behavior={behavior}
          speech={speech}
          showSpeech={settings.speech}
        />
      </button>
    </main>
  )
}

function Toggle({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean
  label: string
  description: string
  onChange: (next: boolean) => void
}) {
  return (
    <label className="setting-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  )
}

function SettingsView() {
  const state = useDesktopState()
  const [licenseKey, setLicenseKey] = useState('')
  const [licenseMessage, setLicenseMessage] = useState('')

  if (!window.screenGremlin) {
    return (
      <main className="settings-shell">
        <div className="settings-card">
          <h1>Open settings from the ScreenGremlin tray icon.</h1>
        </div>
      </main>
    )
  }

  if (!state) {
    return (
      <main className="settings-shell">
        <div className="settings-card">
          <p>Loading ScreenGremlin…</p>
        </div>
      </main>
    )
  }

  const update = (patch: Partial<GremlinSettings>) => {
    void window.screenGremlin?.updateSettings(patch)
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

  const settings = state.settings

  return (
    <main className="settings-shell">
      <section className="settings-card">
        <header className="settings-header">
          <div>
            <span className="settings-kicker">ScreenGremlin {state.appVersion}</span>
            <h1>Control the menace.</h1>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={() => void window.screenGremlin?.closeSettings()}
            aria-label="Close settings"
          >
            ×
          </button>
        </header>

        <button
          className={`pause-button ${settings.paused ? 'is-paused' : ''}`}
          type="button"
          onClick={() => update({ paused: !settings.paused })}
        >
          <span>{settings.paused ? 'Resume Gremlin' : 'Pause Gremlin'}</span>
          <kbd>Ctrl/⌘ + Shift + G</kbd>
        </button>

        <div className="settings-section">
          <h2>Personality</h2>
          <div className="segmented">
            {(['chill', 'normal', 'chaos'] as Intensity[]).map((intensity) => {
              const locked = intensity === 'chaos' && !state.pro

              return (
                <button
                  key={intensity}
                  type="button"
                  disabled={locked}
                  className={settings.intensity === intensity ? 'active' : ''}
                  onClick={() => update({ intensity })}
                >
                  {intensity}
                  {locked ? ' · Pro' : ''}
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
                  <span />
                  {theme}
                  {locked ? ' · Pro' : ''}
                </button>
              )
            })}
          </div>
        </div>

        <div className="settings-section">
          <h2>Desktop</h2>
          <Toggle
            checked={settings.speech}
            label="Speech bubbles"
            description="Let the Gremlin talk back."
            onChange={(speech) => update({ speech })}
          />
          <Toggle
            checked={settings.notices}
            label="Mischief notices"
            description="Occasional tiny fake status messages."
            onChange={(notices) => update({ notices })}
          />
          <Toggle
            checked={settings.allDisplays}
            label="All displays"
            description="Let one Gremlin loose on every monitor."
            onChange={(allDisplays) => update({ allDisplays })}
          />
          <Toggle
            checked={settings.alwaysOnTop}
            label="Stay on top"
            description="Keep the Gremlin above normal app windows."
            onChange={(alwaysOnTop) => update({ alwaysOnTop })}
          />
          <Toggle
            checked={settings.startAtLogin}
            label="Start at login"
            description="Launch ScreenGremlin when you sign in."
            onChange={(startAtLogin) => update({ startAtLogin })}
          />
        </div>

        <div className="settings-section license-panel">
          <div className="license-heading">
            <div>
              <h2>ScreenGremlin Pro</h2>
              <p>Chaos mode, extra colors, and future Pro packs.</p>
            </div>
            <span className={state.pro ? 'pro-badge active' : 'pro-badge'}>
              {state.pro ? 'Unlocked' : `$${state.priceUsd}`}
            </span>
          </div>

          {state.pro ? (
            <div className="license-active">
              <p>
                Licensed to <strong>{state.license?.owner || 'Developer mode'}</strong>
              </p>
              {state.license && (
                <button
                  className="text-button"
                  type="button"
                  onClick={() => void window.screenGremlin?.deactivateLicense()}
                >
                  Deactivate license
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="license-entry">
                <input
                  value={licenseKey}
                  onChange={(event) => setLicenseKey(event.target.value)}
                  placeholder="SG1.…"
                  aria-label="ScreenGremlin license key"
                />
                <button type="button" onClick={activateLicense}>
                  Unlock
                </button>
              </div>
              {licenseMessage && <p className="license-message">{licenseMessage}</p>}

              <div className="purchase-actions">
                <button
                  type="button"
                  className="primary-button"
                  disabled={!state.checkoutUrl}
                  onClick={() => void openUrl(state.checkoutUrl)}
                >
                  Buy Pro · ${state.priceUsd}
                </button>
                {state.creatorUnlockUrl && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void openUrl(state.creatorUnlockUrl)}
                  >
                    Creator unlock
                  </button>
                )}
              </div>

              {!state.checkoutUrl && (
                <p className="config-note">
                  Checkout is not connected in this development build.
                </p>
              )}
            </>
          )}
        </div>

        <footer className="settings-footer">
          <span>No analytics. No account required.</span>
          <span>{state.platform}</span>
        </footer>
      </section>
    </main>
  )
}

function DemoGremlin() {
  const [quote, setQuote] = useState('i live here now.')

  return (
    <button
      type="button"
      className="landing-demo-gremlin"
      onClick={() => setQuote(randomItem(taunts))}
      aria-label="Poke the demo Gremlin"
    >
      <span className="demo-speech">{quote}</span>
      <span className="demo-ear demo-ear--left" />
      <span className="demo-ear demo-ear--right" />
      <span className="demo-body">
        <span className="demo-eye demo-eye--left" />
        <span className="demo-eye demo-eye--right" />
        <span className="demo-mouth" />
      </span>
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
        <div>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a className="nav-download" href={downloadUrl}>Download</a>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="hero-kicker">A tiny menace for your desktop.</p>
          <h1>Your screen has a new roommate.</h1>
          <p className="hero-subtitle">
            ScreenGremlin wanders across your desktop, hides at the edges,
            talks back when you catch it, and stays out of the way when you work.
          </p>

          <div className="hero-actions">
            <a className="primary-cta" href={downloadUrl}>Download free</a>
            <a
              className={`secondary-cta ${checkoutUrl ? '' : 'is-disabled'}`}
              href={checkoutUrl || '#pricing'}
            >
              Pro · $2.99
            </a>
          </div>

          <p className="hero-meta">
            Windows, macOS & Linux · no account · no analytics
          </p>
        </div>

        <div className="hero-stage" aria-label="Interactive ScreenGremlin demo">
          <div className="fake-window">
            <div className="fake-titlebar"><span /><span /><span /></div>
            <div className="fake-lines">
              <i /><i /><i /><i />
            </div>
          </div>
          <DemoGremlin />
          <p className="demo-hint">poke it</p>
        </div>
      </section>

      <section className="feature-section" id="features">
        <p className="section-kicker">Small app. Strong personality.</p>
        <h2>Annoying enough to be funny. Polite enough to keep installed.</h2>

        <div className="feature-grid">
          <article>
            <span>01</span>
            <h3>Lives over your apps</h3>
            <p>Transparent always-on-top overlay that passes normal clicks through.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Actually has moods</h3>
            <p>Wanders, peeks, naps, taunts, sprints, and reacts when caught.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Your desktop, your rules</h3>
            <p>Pause instantly, choose intensity, colors, speech, displays, and startup behavior.</p>
          </article>
          <article>
            <span>04</span>
            <h3>No creepy tracking</h3>
            <p>Settings stay on your device. The app does not need an account or analytics SDK.</p>
          </article>
        </div>
      </section>

      <section className="pricing-section" id="pricing">
        <div>
          <p className="section-kicker">Impulse-buy sized.</p>
          <h2>Try the Gremlin free. Keep the chaos for $2.99.</h2>
        </div>

        <div className="price-cards">
          <article className="price-card">
            <span>Free</span>
            <strong>$0</strong>
            <p>Core Gremlin, normal and chill intensity, lime theme, tray controls.</p>
            <a href={downloadUrl}>Download</a>
          </article>

          <article className="price-card featured">
            <span>Pro</span>
            <strong>$2.99</strong>
            <p>Chaos mode, extra themes, and future Pro personality packs.</p>
            <a
              className={checkoutUrl ? '' : 'is-disabled'}
              href={checkoutUrl || '#pricing'}
            >
              {checkoutUrl ? 'Buy Pro' : 'Checkout connects at launch'}
            </a>
          </article>
        </div>
      </section>

      <section className="faq-section">
        <h2>Before the Gremlin moves in.</h2>
        <details>
          <summary>Will it block my mouse?</summary>
          <p>No. The overlay passes clicks through except while you interact with the Gremlin.</p>
        </details>
        <details>
          <summary>Can I pause it quickly?</summary>
          <p>Yes. Use the tray menu or Ctrl/⌘ + Shift + G.</p>
        </details>
        <details>
          <summary>Does Pro require an account?</summary>
          <p>No. ScreenGremlin uses an offline signed license key.</p>
        </details>
      </section>

      <footer className="landing-footer">
        <span>ScreenGremlin</span>
        <span>A tiny problem for your desktop.</span>
      </footer>
    </main>
  )
}

export default function App() {
  const mode = new URLSearchParams(window.location.search).get('mode')

  if (mode === 'overlay') return <Overlay />
  if (mode === 'settings') return <SettingsView />
  return <LandingPage />
}
