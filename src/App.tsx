import { useEffect, useMemo, useRef, useState } from 'react'

type Position = {
  x: number
  y: number
}

type Behavior = 'idle' | 'wander' | 'peek' | 'taunt' | 'caught'

const reactions = [
  'hey. rude.',
  'you found me.',
  'stop poking me.',
  'i live here now.',
  'your screen tastes expensive.',
  'that was personal.',
  'i am contacting HR.',
]

const taunts = [
  'working hard or hardly buffering?',
  'i saw that tab you closed.',
  'your desktop needs supervision.',
  'productivity detected. fixing that.',
]

const notices = [
  'Gremlin inspected your productivity.',
  'One suspicious pixel has been relocated.',
  'Gremlin claims this corner now.',
  'Nothing was broken. Probably.',
]

function randomPosition(): Position {
  return {
    x: 9 + Math.random() * 76,
    y: 18 + Math.random() * 63,
  }
}

function edgePosition(): Position {
  const side = Math.random() > 0.5 ? 'left' : 'right'

  return {
    x: side === 'left' ? 2.5 : 97.5,
    y: 24 + Math.random() * 52,
  }
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

export default function App() {
  const isDesktopOverlay = Boolean(window.screenGremlin)
  const [position, setPosition] = useState<Position>({ x: 70, y: 58 })
  const [behavior, setBehavior] = useState<Behavior>('idle')
  const [reactionIndex, setReactionIndex] = useState(0)
  const [pokeCount, setPokeCount] = useState(0)
  const [speech, setSpeech] = useState(reactions[0])
  const [notice, setNotice] = useState<string | null>(null)
  const noticeTimeout = useRef<number | null>(null)
  const behaviorTimeout = useRef<number | null>(null)

  const mischiefLevel = useMemo(() => {
    if (pokeCount >= 8) return 'uncontained'
    if (pokeCount >= 4) return 'questionable'
    if (pokeCount >= 1) return 'awake'
    return 'warming up'
  }, [pokeCount])

  useEffect(() => {
    function clearBehaviorTimeout() {
      if (behaviorTimeout.current !== null) {
        window.clearTimeout(behaviorTimeout.current)
      }
    }

    function performMischief() {
      clearBehaviorTimeout()
      const roll = Math.random()

      if (roll < 0.55) {
        setBehavior('wander')
        setPosition(randomPosition())
        behaviorTimeout.current = window.setTimeout(() => setBehavior('idle'), 1150)
        return
      }

      if (roll < 0.8) {
        setBehavior('peek')
        setPosition(edgePosition())
        setSpeech('just checking something...')
        behaviorTimeout.current = window.setTimeout(() => setBehavior('idle'), 1500)
        return
      }

      setBehavior('taunt')
      setPosition(randomPosition())
      setSpeech(randomItem(taunts))
      setNotice(randomItem(notices))

      if (noticeTimeout.current !== null) {
        window.clearTimeout(noticeTimeout.current)
      }

      noticeTimeout.current = window.setTimeout(() => setNotice(null), 1700)
      behaviorTimeout.current = window.setTimeout(() => setBehavior('idle'), 1300)
    }

    const timer = window.setInterval(performMischief, 3200)

    return () => {
      window.clearInterval(timer)
      clearBehaviorTimeout()
      window.screenGremlin?.setInteractive(false)

      if (noticeTimeout.current !== null) {
        window.clearTimeout(noticeTimeout.current)
      }
    }
  }, [])

  function setOverlayInteractive(interactive: boolean) {
    window.screenGremlin?.setInteractive(interactive)
  }

  function pokeGremlin() {
    const nextReactionIndex = reactionIndex + 1
    const nextPokeCount = pokeCount + 1

    setReactionIndex(nextReactionIndex)
    setPokeCount(nextPokeCount)
    setBehavior('caught')
    setSpeech(reactions[nextReactionIndex % reactions.length])
    setPosition(randomPosition())
    setOverlayInteractive(false)

    if (behaviorTimeout.current !== null) {
      window.clearTimeout(behaviorTimeout.current)
    }

    behaviorTimeout.current = window.setTimeout(() => setBehavior('idle'), 700)

    if (nextPokeCount % 3 === 0) {
      setNotice(`Poke #${nextPokeCount}: Gremlin is taking notes.`)

      if (noticeTimeout.current !== null) {
        window.clearTimeout(noticeTimeout.current)
      }

      noticeTimeout.current = window.setTimeout(() => setNotice(null), 1700)
    }
  }

  return (
    <main
      className={`screen screen--${behavior} ${isDesktopOverlay ? 'screen--desktop' : ''}`}
      aria-label="ScreenGremlin prototype"
    >
      <header className="brand">
        <span className="brand-dot" aria-hidden="true" />
        <span>ScreenGremlin</span>
        <span className="prototype-tag">prototype 03</span>
      </header>

      <section className="intro">
        <p className="eyebrow">A tiny problem has moved into your screen.</p>
        <h1>Meet your new worst coworker.</h1>
        <p className="intro-copy">
          It wanders, hides at the edges, talks back, and remembers every poke.
        </p>
        <p className="hint">Try catching it a few times.</p>
      </section>

      {notice && (
        <aside className="gremlin-notice" role="status">
          <span className="gremlin-notice__dot" aria-hidden="true" />
          {notice}
        </aside>
      )}

      <button
        className={`gremlin gremlin--${behavior}`}
        style={{ left: `${position.x}%`, top: `${position.y}%` }}
        onMouseEnter={() => setOverlayInteractive(true)}
        onMouseLeave={() => setOverlayInteractive(false)}
        onClick={pokeGremlin}
        aria-label={`Poke the ScreenGremlin. Poked ${pokeCount} times.`}
        type="button"
      >
        <span className="speech-bubble">{speech}</span>
        <span className="ear ear--left" aria-hidden="true" />
        <span className="ear ear--right" aria-hidden="true" />
        <span className="gremlin-body" aria-hidden="true">
          <span className="brow brow--left" />
          <span className="brow brow--right" />
          <span className="eye eye--left" />
          <span className="eye eye--right" />
          <span className="mouth" />
        </span>
      </button>

      <footer className="status-bar">
        <span>pokes: {pokeCount}</span>
        <span>mischief: {mischiefLevel}</span>
      </footer>
    </main>
  )
}
