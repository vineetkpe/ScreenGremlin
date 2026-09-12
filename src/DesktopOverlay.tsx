import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  DEFAULT_SETTINGS,
  PERSONALITIES,
  edgePosition,
  isFocusActive,
  notices,
  randomItem,
  randomPosition,
  themeColors,
  type Accessory,
  type Behavior,
  type GremlinSettings,
  type Position,
  type Toy,
} from './gremlin'
import useDesktopState from './useDesktopState'

let sharedAudioContext: AudioContext | null = null

function playTinySound(enabled: boolean, kind: 'poke' | 'throw' | 'toy') {
  if (!enabled) return
  try {
    sharedAudioContext ??= new AudioContext()
    const context = sharedAudioContext
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const now = context.currentTime
    oscillator.type = kind === 'toy' ? 'sine' : 'triangle'
    oscillator.frequency.setValueAtTime(kind === 'throw' ? 170 : kind === 'toy' ? 520 : 360, now)
    oscillator.frequency.exponentialRampToValueAtTime(kind === 'throw' ? 110 : kind === 'toy' ? 680 : 450, now + 0.07)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.09)
  } catch {
    // Sounds are optional; audio failure must never affect the overlay.
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function AccessoryView({ accessory }: { accessory: Accessory }) {
  if (accessory === 'none') return null
  return <span className={`gremlin-accessory gremlin-accessory--${accessory}`} aria-hidden="true" />
}

function GremlinFace({
  behavior,
  speech,
  showSpeech,
  accessory,
  toy,
}: {
  behavior: Behavior
  speech: string
  showSpeech: boolean
  accessory: Accessory
  toy: Toy | null
}) {
  return (
    <>
      {showSpeech && <span className="speech-bubble">{speech}</span>}
      <span className="ear ear--left" aria-hidden="true" />
      <span className="ear ear--right" aria-hidden="true" />
      <span className="gremlin-body" aria-hidden="true">
        <AccessoryView accessory={accessory} />
        <span className="brow brow--left" />
        <span className="brow brow--right" />
        <span className="eye eye--left" />
        <span className="eye eye--right" />
        <span className="mouth" />
        {behavior === 'nap' && <span className="sleep-mark">z</span>}
        {toy === 'ball' && <span className="gremlin-toy gremlin-toy--ball" />}
        {toy === 'snack' && <span className="gremlin-toy gremlin-toy--snack">◆</span>}
      </span>
    </>
  )
}

type ToyEvent = { id: number; toy: Toy } | null

function GremlinActor({
  index,
  settings,
  toyEvent,
  onNotice,
}: {
  index: number
  settings: GremlinSettings
  toyEvent: ToyEvent
  onNotice: (message: string) => void
}) {
  const personality = PERSONALITIES[settings.personality]
  const [position, setPosition] = useState<Position>(index === 0 ? { x: 70, y: 58 } : { x: 28, y: 42 })
  const [behavior, setBehavior] = useState<Behavior>('idle')
  const [speech, setSpeech] = useState(personality.lines[0])
  const [pokeCount, setPokeCount] = useState(0)
  const [toy, setToy] = useState<Toy | null>(null)
  const dragging = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0, time: 0 })
  const velocity = useRef({ x: 0, y: 0 })
  const behaviorTimeout = useRef<number | null>(null)
  const toyTimeout = useRef<number | null>(null)
  const throwFrame = useRef<number | null>(null)

  const intervalMs = useMemo(() => {
    const base = settings.intensity === 'chill' ? 6500 : settings.intensity === 'chaos' ? 2200 : 3600
    if (settings.personality === 'lazy') return base + 1500
    if (settings.personality === 'chaotic') return Math.max(1600, base - 700)
    return base + index * 420
  }, [index, settings.intensity, settings.personality])

  useEffect(() => {
    setSpeech(personality.lines[0])
  }, [personality])

  useEffect(() => {
    if (!toyEvent) return
    if (index === 1 && Math.random() > 0.65) return
    setToy(toyEvent.toy)
    setBehavior('toy')
    setSpeech(toyEvent.toy === 'ball' ? 'mine now.' : 'snack acquired.')
    playTinySound(settings.sounds, 'toy')
    if (toyTimeout.current !== null) window.clearTimeout(toyTimeout.current)
    toyTimeout.current = window.setTimeout(() => {
      setToy(null)
      setBehavior('idle')
    }, 2100)
  }, [index, settings.sounds, toyEvent])

  useEffect(() => {
    if (settings.paused || isFocusActive(settings)) return

    const clearBehavior = () => {
      if (behaviorTimeout.current !== null) window.clearTimeout(behaviorTimeout.current)
    }

    const performMischief = () => {
      if (dragging.current || toy) return
      clearBehavior()
      const roll = Math.random()

      if (settings.rareAnimations && roll < 0.11) {
        const rare: Behavior[] = settings.personality === 'lazy'
          ? ['nap', 'nap', 'spin']
          : settings.personality === 'chaotic'
            ? ['dance', 'spin', 'zoom']
            : ['dance', 'spin', 'trip']
        const next = randomItem(rare)
        setBehavior(next)
        setPosition(randomPosition())
        setSpeech(next === 'dance' ? 'tiny dance break.' : next === 'spin' ? 'calculated.' : next === 'trip' ? 'floor check.' : 'five minute break.')
        behaviorTimeout.current = window.setTimeout(() => setBehavior('idle'), 1300)
        return
      }

      if ((settings.personality === 'lazy' && roll < 0.38) || (settings.intensity === 'chill' && roll > 0.82)) {
        setBehavior('nap')
        setPosition(randomPosition())
        setSpeech('five more minutes.')
        behaviorTimeout.current = window.setTimeout(() => setBehavior('idle'), 2400)
        return
      }

      if ((settings.personality === 'chaotic' || settings.intensity === 'chaos') && roll > 0.76) {
        setBehavior('zoom')
        setPosition(randomPosition())
        setSpeech('catch me.')
        if (settings.notices) onNotice(randomItem(notices))
        behaviorTimeout.current = window.setTimeout(() => setBehavior('idle'), 850)
        return
      }

      if (roll < 0.52) {
        setBehavior('wander')
        setPosition(randomPosition())
        behaviorTimeout.current = window.setTimeout(() => setBehavior('idle'), 1150)
        return
      }

      if (roll < 0.76) {
        setBehavior('peek')
        setPosition(edgePosition())
        setSpeech('just checking...')
        behaviorTimeout.current = window.setTimeout(() => setBehavior('idle'), 1600)
        return
      }

      setBehavior('taunt')
      setPosition(randomPosition())
      setSpeech(randomItem(personality.lines))
      if (settings.notices && Math.random() > 0.45) onNotice(randomItem(notices))
      behaviorTimeout.current = window.setTimeout(() => setBehavior('idle'), 1500)
    }

    const timer = window.setInterval(performMischief, intervalMs)
    return () => {
      window.clearInterval(timer)
      clearBehavior()
    }
  }, [intervalMs, onNotice, personality.lines, settings, toy])

  useEffect(() => () => {
    if (behaviorTimeout.current !== null) window.clearTimeout(behaviorTimeout.current)
    if (toyTimeout.current !== null) window.clearTimeout(toyTimeout.current)
    if (throwFrame.current !== null) window.cancelAnimationFrame(throwFrame.current)
  }, [])

  function pokeGremlin() {
    if (dragging.current) return
    const nextPokes = pokeCount + 1
    setPokeCount(nextPokes)
    setBehavior('caught')
    setSpeech(randomItem(personality.reactions))
    playTinySound(settings.sounds, 'poke')
    if (settings.notices && nextPokes % 4 === 0) onNotice(`${settings.name} has recorded poke #${nextPokes}.`)
    if (behaviorTimeout.current !== null) window.clearTimeout(behaviorTimeout.current)
    behaviorTimeout.current = window.setTimeout(() => setBehavior('idle'), 720)
  }

  function pointerPosition(event: ReactPointerEvent<HTMLButtonElement>): Position {
    return {
      x: clamp((event.clientX / Math.max(1, window.innerWidth)) * 100, 5, 95),
      y: clamp((event.clientY / Math.max(1, window.innerHeight)) * 100, 7, 93),
    }
  }

  function beginDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return
    if (throwFrame.current !== null) window.cancelAnimationFrame(throwFrame.current)
    dragging.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    lastPointer.current = { x: event.clientX, y: event.clientY, time: performance.now() }
    velocity.current = { x: 0, y: 0 }
    setBehavior('dragged')
    setSpeech('put me down.')
    window.screenGremlin?.setInteractive(true)
  }

  function moveDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragging.current) return
    const now = performance.now()
    const elapsed = Math.max(8, now - lastPointer.current.time)
    velocity.current = {
      x: (event.clientX - lastPointer.current.x) / elapsed,
      y: (event.clientY - lastPointer.current.y) / elapsed,
    }
    lastPointer.current = { x: event.clientX, y: event.clientY, time: now }
    setPosition(pointerPosition(event))
  }

  function endDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragging.current) return
    dragging.current = false
    try { event.currentTarget.releasePointerCapture(event.pointerId) } catch { /* already released */ }

    let vx = velocity.current.x
    let vy = velocity.current.y
    const speed = Math.hypot(vx, vy)
    if (speed < 0.08) {
      setBehavior('caught')
      window.setTimeout(() => setBehavior('idle'), 500)
      window.setTimeout(() => window.screenGremlin?.setInteractive(false), 80)
      return
    }

    setBehavior('thrown')
    setSpeech('WHEE.')
    playTinySound(settings.sounds, 'throw')
    let previous = performance.now()
    let elapsedTotal = 0

    const animate = (now: number) => {
      const dt = Math.min(34, now - previous)
      previous = now
      elapsedTotal += dt
      const friction = Math.pow(0.94, dt / 16.67)
      vx *= friction
      vy *= friction

      setPosition((current) => {
        let px = (current.x / 100) * window.innerWidth + vx * dt
        let py = (current.y / 100) * window.innerHeight + vy * dt
        const minX = window.innerWidth * 0.05
        const maxX = window.innerWidth * 0.95
        const minY = window.innerHeight * 0.07
        const maxY = window.innerHeight * 0.93
        if (px < minX || px > maxX) { vx *= -0.62; px = clamp(px, minX, maxX) }
        if (py < minY || py > maxY) { vy *= -0.62; py = clamp(py, minY, maxY) }
        return { x: (px / window.innerWidth) * 100, y: (py / window.innerHeight) * 100 }
      })

      if (elapsedTotal < 1100 && Math.hypot(vx, vy) > 0.025) {
        throwFrame.current = window.requestAnimationFrame(animate)
      } else {
        setBehavior('idle')
        throwFrame.current = null
        window.setTimeout(() => window.screenGremlin?.setInteractive(false), 80)
      }
    }
    throwFrame.current = window.requestAnimationFrame(animate)
  }

  return (
    <button
      className={`gremlin gremlin--${behavior} gremlin--actor-${index}`}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      onPointerEnter={() => window.screenGremlin?.setInteractive(true)}
      onPointerLeave={() => { if (!dragging.current) window.screenGremlin?.setInteractive(false) }}
      onPointerDown={beginDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={pokeGremlin}
      aria-label={`${settings.name}${index ? ' two' : ''}. Drag, throw, or poke.`}
      type="button"
    >
      <GremlinFace behavior={behavior} speech={speech} showSpeech={settings.speech} accessory={settings.accessory} toy={toy} />
    </button>
  )
}

export default function DesktopOverlay() {
  const state = useDesktopState()
  const settings = state?.settings ?? DEFAULT_SETTINGS
  const [expanded, setExpanded] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [toyEvent, setToyEvent] = useState<ToyEvent>(null)
  const [now, setNow] = useState(Date.now())
  const noticeTimeout = useRef<number | null>(null)
  const focusActive = isFocusActive(settings, now)
  const asleep = settings.paused || focusActive

  useEffect(() => {
    if (!focusActive) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [focusActive])

  useEffect(() => {
    if (settings.focusUntil && settings.focusUntil <= now) {
      void window.screenGremlin?.updateSettings({ focusUntil: null })
    }
  }, [now, settings.focusUntil])

  function showNotice(message: string) {
    setNotice(message)
    if (noticeTimeout.current !== null) window.clearTimeout(noticeTimeout.current)
    noticeTimeout.current = window.setTimeout(() => setNotice(null), 1900)
  }

  function update(patch: Partial<GremlinSettings>) {
    void window.screenGremlin?.updateSettings(patch)
  }

  function startFocus(minutes: number) {
    update({ paused: false, focusUntil: Date.now() + minutes * 60_000 })
    setNow(Date.now())
    setExpanded(false)
  }

  function playToy(toy: Toy) {
    if (toy === 'snack' && !state?.pro) return
    setToyEvent({ id: Date.now(), toy })
    setExpanded(false)
  }

  const focusMinutes = focusActive && settings.focusUntil
    ? Math.max(1, Math.ceil((settings.focusUntil - now) / 60_000))
    : 0

  const rootStyle = { '--gremlin-accent': themeColors[settings.theme] } as CSSProperties

  return (
    <main className="overlay-root" style={rootStyle} aria-label="ScreenGremlin desktop overlay">
      {notice && (
        <aside className="gremlin-notice" role="status">
          <span className="gremlin-notice__dot" aria-hidden="true" />{notice}
        </aside>
      )}

      {!asleep && (
        <>
          <GremlinActor index={0} settings={settings} toyEvent={toyEvent} onNotice={showNotice} />
          {settings.duo && state?.pro && <GremlinActor index={1} settings={settings} toyEvent={toyEvent} onNotice={showNotice} />}
        </>
      )}

      <aside
        className={`gremlin-dock ${asleep ? 'is-paused' : ''}`}
        onPointerEnter={() => window.screenGremlin?.setInteractive(true)}
        onPointerLeave={() => window.screenGremlin?.setInteractive(false)}
        aria-label="ScreenGremlin quick controls"
      >
        {expanded && (
          <div className="gremlin-dock__panel">
            <div className="gremlin-dock__heading">
              <strong>{settings.name}</strong>
              <span>{PERSONALITIES[settings.personality].label}</span>
            </div>
            <div className="gremlin-dock__grid">
              <button type="button" onClick={() => update({ sounds: !settings.sounds })}>Sound <b>{settings.sounds ? 'On' : 'Off'}</b></button>
              <button type="button" onClick={() => update({ speech: !settings.speech })}>Speech <b>{settings.speech ? 'On' : 'Off'}</b></button>
              <button type="button" onClick={() => playToy('ball')}>⚽ Ball</button>
              <button type="button" disabled={!state?.pro} onClick={() => playToy('snack')}>◆ Snack{!state?.pro ? ' · Pro' : ''}</button>
              <button type="button" onClick={() => startFocus(30)}>Focus 30m</button>
              <button type="button" onClick={() => startFocus(60)}>Focus 1h</button>
              <button type="button" onClick={() => void window.screenGremlin?.openSettings()}>Settings</button>
              <button type="button" className="danger" onClick={() => void window.screenGremlin?.quitApp()}>Quit</button>
            </div>
            <p>Drag + throw the Gremlin · Ctrl/⌘ + Shift + G pauses</p>
          </div>
        )}

        <div className="gremlin-dock__bar">
          <button
            className="gremlin-dock__pause"
            type="button"
            onClick={() => focusActive ? update({ focusUntil: null }) : update({ paused: !settings.paused })}
          >
            <span aria-hidden="true">{asleep ? '▶' : 'Ⅱ'}</span>
            {focusActive ? `End Focus · ${focusMinutes}m` : settings.paused ? 'Resume Gremlin' : 'Pause Gremlin'}
          </button>
          <button
            className="gremlin-dock__more"
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Close quick controls' : 'Open quick controls'}
          >{expanded ? '×' : '•••'}</button>
        </div>
      </aside>
    </main>
  )
}
