import { useEffect, useMemo, useState } from 'react'

type Position = {
  x: number
  y: number
}

const reactions = [
  'hey. rude.',
  'you found me.',
  'stop poking me.',
  'i live here now.',
  'your screen tastes expensive.',
]

function randomPosition(): Position {
  return {
    x: 8 + Math.random() * 78,
    y: 18 + Math.random() * 64,
  }
}

export default function App() {
  const [position, setPosition] = useState<Position>({ x: 70, y: 58 })
  const [reactionIndex, setReactionIndex] = useState(0)
  const [isReacting, setIsReacting] = useState(false)

  const reaction = useMemo(
    () => reactions[reactionIndex % reactions.length],
    [reactionIndex],
  )

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPosition(randomPosition())
    }, 3600)

    return () => window.clearInterval(timer)
  }, [])

  function pokeGremlin() {
    setReactionIndex((current) => current + 1)
    setIsReacting(true)
    setPosition(randomPosition())

    window.setTimeout(() => setIsReacting(false), 700)
  }

  return (
    <main className="screen" aria-label="ScreenGremlin prototype">
      <header className="brand">
        <span className="brand-dot" aria-hidden="true" />
        <span>ScreenGremlin</span>
        <span className="prototype-tag">prototype 01</span>
      </header>

      <section className="intro">
        <p className="eyebrow">A tiny problem has moved into your screen.</p>
        <h1>Meet your new worst coworker.</h1>
        <p className="intro-copy">
          It wanders. It judges. It absolutely does not pay rent.
        </p>
        <p className="hint">Try clicking the Gremlin.</p>
      </section>

      <button
        className={`gremlin ${isReacting ? 'gremlin--reacting' : ''}`}
        style={{ left: `${position.x}%`, top: `${position.y}%` }}
        onClick={pokeGremlin}
        aria-label="Poke the ScreenGremlin"
        type="button"
      >
        <span className="speech-bubble">{reaction}</span>
        <span className="ear ear--left" aria-hidden="true" />
        <span className="ear ear--right" aria-hidden="true" />
        <span className="gremlin-body" aria-hidden="true">
          <span className="eye eye--left" />
          <span className="eye eye--right" />
          <span className="mouth" />
        </span>
      </button>

      <footer className="status-bar">
        <span>status: loose</span>
        <span>mischief: increasing</span>
      </footer>
    </main>
  )
}
