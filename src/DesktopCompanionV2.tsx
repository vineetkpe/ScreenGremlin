import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  EXPRESSIONS,
  markReminderFired,
  readProductivity,
  useCompanionPrefs,
  writeCompanionPrefs,
  type DangleEdge,
  type Expression,
} from './companion-store'
import { PERSONALITIES, randomItem, themeColors, type GremlinSettings, type Position } from './gremlin'
import useDesktopState from './useDesktopState'

type DuoAction = 'chase' | 'spar' | 'highfive' | 'dance' | 'steal' | 'race' | 'nap' | 'stare'
type DuoEvent = { id: number; action: DuoAction } | null

const DUO_ACTIONS: DuoAction[] = ['chase', 'spar', 'highfive', 'dance', 'steal', 'race', 'nap', 'stare']

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function nearestEdge(position: Position): DangleEdge {
  const distances: Array<[DangleEdge, number]> = [
    ['left', position.x], ['right', 100 - position.x], ['top', position.y], ['bottom', 100 - position.y],
  ]
  distances.sort((a, b) => a[1] - b[1])
  return distances[0][0]
}

function danglePosition(edge: DangleEdge, index: number): Position {
  if (edge === 'top') return { x: index ? 58 : 48, y: 7 }
  if (edge === 'bottom') return { x: index ? 58 : 48, y: 92 }
  if (edge === 'left') return { x: 5, y: index ? 58 : 46 }
  return { x: 95, y: index ? 58 : 46 }
}

function expressionForAction(action: DuoAction, index: number): Expression {
  const map: Record<DuoAction, [Expression, Expression]> = {
    chase: ['excited', 'scared'],
    spar: ['determined', 'angry'],
    highfive: ['happy', 'celebrate'],
    dance: ['dance', 'laugh'],
    steal: ['sneaky', 'shocked'],
    race: ['determined', 'excited'],
    nap: ['sleepy', 'sleepy'],
    stare: ['curious', 'confused'],
  }
  return map[action][index]
}

function duoTarget(action: DuoAction, index: number): Position {
  const map: Record<DuoAction, [Position, Position]> = {
    chase: [{ x: 44, y: 47 }, { x: 58, y: 47 }],
    spar: [{ x: 45, y: 52 }, { x: 56, y: 52 }],
    highfive: [{ x: 47, y: 48 }, { x: 54, y: 48 }],
    dance: [{ x: 44, y: 52 }, { x: 57, y: 52 }],
    steal: [{ x: 47, y: 55 }, { x: 57, y: 55 }],
    race: [{ x: 20, y: index ? 62 : 56 }, { x: 20, y: index ? 62 : 56 }],
    nap: [{ x: 46, y: 75 }, { x: 56, y: 75 }],
    stare: [{ x: 47, y: 50 }, { x: 55, y: 50 }],
  }
  return map[action][index]
}

function CharacterBody({ expression, index }: { expression: Expression; index: number }) {
  return (
    <span className={`companion-body expression-${expression}`} aria-hidden="true">
      <span className="companion-special companion-special--a" />
      <span className="companion-special companion-special--b" />
      <span className="companion-ear companion-ear--left" />
      <span className="companion-ear companion-ear--right" />
      <span className="companion-brow companion-brow--left" />
      <span className="companion-brow companion-brow--right" />
      <span className="companion-eye companion-eye--left" />
      <span className="companion-eye companion-eye--right" />
      <span className="companion-mouth" />
      {index === 1 && <span className="companion-duo-mark">2</span>}
    </span>
  )
}

function CompanionActor({
  index,
  settings,
  pro,
  duoEvent,
  onMessage,
}: {
  index: number
  settings: GremlinSettings
  pro: boolean
  duoEvent: DuoEvent
  onMessage: (message: string) => void
}) {
  const prefs = useCompanionPrefs()
  const personality = PERSONALITIES[settings.personality]
  const initial = index === 0 ? { x: prefs.lastX, y: prefs.lastY } : { x: clamp(prefs.lastX - 13, 8, 92), y: clamp(prefs.lastY + 6, 10, 90) }
  const [position, setPosition] = useState<Position>(initial)
  const [expression, setExpression] = useState<Expression>('neutral')
  const [speech, setSpeech] = useState(index ? 'backup gremlin online.' : personality.lines[0])
  const [action, setAction] = useState<string>('idle')
  const dragging = useRef(false)
  const distance = useRef(0)
  const lastPointer = useRef({ x: 0, y: 0, time: 0 })
  const velocity = useRef({ x: 0, y: 0 })
  const throwFrame = useRef<number | null>(null)
  const actionTimer = useRef<number | null>(null)

  const customStyle = useMemo(() => ({
    '--custom-primary': prefs.customPrimary,
    '--custom-secondary': prefs.customSecondary,
  }) as CSSProperties, [prefs.customPrimary, prefs.customSecondary])

  useEffect(() => {
    if (prefs.movementMode === 'parked') {
      setPosition(index === 0 ? { x: prefs.lastX, y: prefs.lastY } : { x: clamp(prefs.lastX - 10, 7, 93), y: prefs.lastY })
      setAction('parked')
      setExpression('focused')
    } else if (prefs.movementMode === 'dangle') {
      setPosition(danglePosition(prefs.dangleEdge, index))
      setAction(`dangle-${prefs.dangleEdge}`)
      setExpression(index ? 'curious' : 'happy')
    }
  }, [index, prefs.dangleEdge, prefs.lastX, prefs.lastY, prefs.movementMode])

  useEffect(() => {
    if (!duoEvent || !pro || prefs.movementMode !== 'free') return
    if (actionTimer.current !== null) window.clearTimeout(actionTimer.current)
    setPosition(duoTarget(duoEvent.action, index))
    setExpression(expressionForAction(duoEvent.action, index))
    setAction(`duo-${duoEvent.action}`)
    const lines: Record<DuoAction, [string, string]> = {
      chase: ['come back!', 'absolutely not!'],
      spar: ['tiny duel.', 'square up. politely.'],
      highfive: ['teamwork!', 'bonk five!'],
      dance: ['dance break.', 'this is choreography.'],
      steal: ['mine now.', 'HEY.'],
      race: ['race you.', 'boosting!'],
      nap: ['truce?', 'truce.'],
      stare: ['...', 'why are you looking at me?'],
    }
    setSpeech(lines[duoEvent.action][index])
    actionTimer.current = window.setTimeout(() => {
      setAction('idle')
      setExpression('neutral')
    }, 2600)
  }, [duoEvent, index, prefs.movementMode, pro])

  useEffect(() => {
    if (settings.paused || prefs.movementMode !== 'free' || dragging.current) return
    const base = settings.intensity === 'chill' ? 6800 : settings.intensity === 'chaos' ? 2700 : 4400
    const timer = window.setInterval(() => {
      if (dragging.current || duoEvent) return
      const next = { x: 10 + Math.random() * 80, y: 16 + Math.random() * 67 }
      setPosition(next)
      if (index === 0) writeCompanionPrefs({ lastX: next.x, lastY: next.y })
      const nextExpression = randomItem([...EXPRESSIONS])
      setExpression(nextExpression)
      setSpeech(randomItem(personality.lines))
      setAction(Math.random() > 0.78 ? 'hop' : 'wander')
      actionTimer.current = window.setTimeout(() => {
        setAction('idle')
        setExpression('neutral')
      }, 1300)
    }, base + index * 500)
    return () => window.clearInterval(timer)
  }, [duoEvent, index, personality.lines, prefs.movementMode, settings.intensity, settings.paused])

  useEffect(() => () => {
    if (throwFrame.current !== null) window.cancelAnimationFrame(throwFrame.current)
    if (actionTimer.current !== null) window.clearTimeout(actionTimer.current)
  }, [])

  function pointerPosition(event: ReactPointerEvent<HTMLButtonElement>): Position {
    return {
      x: clamp((event.clientX / Math.max(1, window.innerWidth)) * 100, 5, 95),
      y: clamp((event.clientY / Math.max(1, window.innerHeight)) * 100, 7, 93),
    }
  }

  function pointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return
    if (throwFrame.current !== null) window.cancelAnimationFrame(throwFrame.current)
    dragging.current = true
    distance.current = 0
    lastPointer.current = { x: event.clientX, y: event.clientY, time: performance.now() }
    velocity.current = { x: 0, y: 0 }
    event.currentTarget.setPointerCapture(event.pointerId)
    setAction('dragged')
    setExpression('shocked')
    setSpeech('put me down.')
    window.screenGremlin?.setInteractive(true)
  }

  function pointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragging.current) return
    const now = performance.now()
    const dt = Math.max(8, now - lastPointer.current.time)
    const dx = event.clientX - lastPointer.current.x
    const dy = event.clientY - lastPointer.current.y
    distance.current += Math.hypot(dx, dy)
    velocity.current = { x: dx / dt, y: dy / dt }
    lastPointer.current = { x: event.clientX, y: event.clientY, time: now }
    setPosition(pointerPosition(event))
  }

  function pointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragging.current) return
    dragging.current = false
    try { event.currentTarget.releasePointerCapture(event.pointerId) } catch { /* no-op */ }
    const current = pointerPosition(event)

    if (prefs.movementMode === 'parked') {
      setPosition(current)
      if (index === 0) writeCompanionPrefs({ lastX: current.x, lastY: current.y })
      setAction('parked')
      setExpression('focused')
      onMessage('Parked here. Drag me whenever you want to move me.')
      return
    }

    if (prefs.movementMode === 'dangle') {
      const edge = nearestEdge(current)
      const snapped = danglePosition(edge, index)
      setPosition(snapped)
      if (index === 0) writeCompanionPrefs({ dangleEdge: edge, lastX: current.x, lastY: current.y })
      setAction(`dangle-${edge}`)
      setExpression('happy')
      onMessage(`Hanging from the ${edge} edge.`)
      return
    }

    if (distance.current < 6) {
      setAction('poke')
      setExpression(randomItem<Expression>(['annoyed', 'laugh', 'shocked', 'mischief']))
      setSpeech(randomItem(personality.reactions))
      actionTimer.current = window.setTimeout(() => { setAction('idle'); setExpression('neutral') }, 800)
      return
    }

    let vx = velocity.current.x
    let vy = velocity.current.y
    setAction('thrown')
    setExpression('dizzy')
    setSpeech('WHEE.')
    let previous = performance.now()
    let elapsed = 0
    const animate = (now: number) => {
      const dt = Math.min(34, now - previous)
      previous = now
      elapsed += dt
      vx *= Math.pow(0.94, dt / 16.67)
      vy *= Math.pow(0.94, dt / 16.67)
      setPosition((before) => {
        let x = before.x + (vx * dt / Math.max(1, window.innerWidth)) * 100
        let y = before.y + (vy * dt / Math.max(1, window.innerHeight)) * 100
        if (x <= 5 || x >= 95) vx *= -0.62
        if (y <= 7 || y >= 93) vy *= -0.62
        x = clamp(x, 5, 95)
        y = clamp(y, 7, 93)
        if (index === 0 && elapsed > 900) writeCompanionPrefs({ lastX: x, lastY: y })
        return { x, y }
      })
      if (elapsed < 1050 && Math.hypot(vx, vy) > 0.025) throwFrame.current = window.requestAnimationFrame(animate)
      else {
        setAction('idle')
        setExpression('neutral')
        throwFrame.current = null
      }
    }
    throwFrame.current = window.requestAnimationFrame(animate)
  }

  const character = prefs.character === 'custom' && !pro ? 'gremlin' : prefs.character
  const customClasses = character === 'custom' ? `custom-${prefs.customShape} custom-eyes-${prefs.customEyes}` : ''

  return (
    <button
      type="button"
      className={`gremlin companion-character companion-character--${character} ${customClasses} companion-action--${action}`}
      data-character={character}
      data-expression={expression}
      style={{ ...customStyle, left: `${position.x}%`, top: `${position.y}%` }}
      onPointerEnter={() => window.screenGremlin?.setInteractive(true)}
      onPointerLeave={() => { if (!dragging.current) window.screenGremlin?.setInteractive(false) }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
      aria-label={`${settings.name}${index ? ' two' : ''}. ${expression}. Right-click for controls.`}
    >
      {settings.speech && <span className="companion-speech">{speech}</span>}
      <CharacterBody expression={expression} index={index} />
    </button>
  )
}

export default function DesktopCompanionV2() {
  const state = useDesktopState()
  const prefs = useCompanionPrefs()
  const settings = state?.settings
  const [message, setMessage] = useState<string | null>(null)
  const [duoEvent, setDuoEvent] = useState<DuoEvent>(null)
  const messageTimer = useRef<number | null>(null)

  function showMessage(text: string) {
    setMessage(text)
    if (messageTimer.current !== null) window.clearTimeout(messageTimer.current)
    messageTimer.current = window.setTimeout(() => setMessage(null), 2800)
  }

  useEffect(() => {
    if (!settings || !state?.pro || !settings.duo || settings.paused || prefs.movementMode !== 'free') return
    const timer = window.setInterval(() => {
      const action = randomItem(DUO_ACTIONS)
      setDuoEvent({ id: Date.now(), action })
      window.setTimeout(() => setDuoEvent(null), 3000)
    }, 11_000)
    return () => window.clearInterval(timer)
  }, [prefs.movementMode, settings, state?.pro])

  useEffect(() => {
    const check = () => {
      const data = readProductivity()
      const due = data.reminders.find((item) => !item.fired && item.dueAt <= Date.now())
      if (!due) return
      markReminderFired(due.id)
      showMessage(`Reminder: ${due.text}`)
    }
    check()
    const timer = window.setInterval(check, 15_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => () => {
    if (messageTimer.current !== null) window.clearTimeout(messageTimer.current)
  }, [])

  if (!state || !settings || settings.paused) return null

  const rootStyle = { '--gremlin-accent': themeColors[settings.theme] } as CSSProperties

  return (
    <main className="companion-v2-root" style={rootStyle}>
      {message && <div className="companion-v2-toast" role="status">{message}</div>}
      <CompanionActor index={0} settings={settings} pro={state.pro} duoEvent={duoEvent} onMessage={showMessage} />
      {settings.duo && state.pro && <CompanionActor index={1} settings={settings} pro={state.pro} duoEvent={duoEvent} onMessage={showMessage} />}
    </main>
  )
}
