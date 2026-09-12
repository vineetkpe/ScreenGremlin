import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import CharacterArtV3 from './CharacterArtV3'
import {
  EXPRESSIONS,
  readProductivity,
  markReminderFired,
  useCompanionPrefs,
  writeCompanionPrefs,
  type DangleEdge,
  type Expression,
} from './companion-store'
import { ropePixels, useCompanionV3Prefs } from './companion-v3-store'
import { PERSONALITIES, randomItem, type GremlinSettings, type Position } from './gremlin'
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

function danglePosition(edge: DangleEdge, anchor: Position, ropePx: number, index: number): Position {
  const charOffset = 54
  const xPct = ((ropePx + charOffset) / Math.max(1, window.innerWidth)) * 100
  const yPct = ((ropePx + charOffset) / Math.max(1, window.innerHeight)) * 100
  const duoOffset = index ? 8 : 0
  if (edge === 'top') return { x: clamp(anchor.x + duoOffset, 8, 92), y: clamp(yPct, 7, 38) }
  if (edge === 'bottom') return { x: clamp(anchor.x + duoOffset, 8, 92), y: clamp(100 - yPct, 62, 93) }
  if (edge === 'left') return { x: clamp(xPct, 5, 32), y: clamp(anchor.y + duoOffset, 10, 90) }
  return { x: clamp(100 - xPct, 68, 95), y: clamp(anchor.y + duoOffset, 10, 90) }
}

function naturalTarget(): { position: Position; action: string; expression: Expression } {
  const roll = Math.random()
  if (roll < 0.32) return { position: { x: 12 + Math.random() * 76, y: 84 + Math.random() * 5 }, action: 'floor-walk', expression: randomItem<Expression>(['neutral','curious','happy','bored']) }
  if (roll < 0.48) return { position: { x: Math.random() > .5 ? 6 : 94, y: 22 + Math.random() * 54 }, action: 'wall-cling', expression: randomItem<Expression>(['curious','mischief','focused']) }
  if (roll < 0.62) return { position: { x: 14 + Math.random() * 72, y: 9 }, action: 'ceiling-peek', expression: randomItem<Expression>(['sneaky','curious','happy']) }
  if (roll < 0.76) return { position: { x: 18 + Math.random() * 64, y: 72 + Math.random() * 10 }, action: 'sit', expression: randomItem<Expression>(['sleepy','thinking','proud']) }
  return { position: { x: 14 + Math.random() * 72, y: 20 + Math.random() * 52 }, action: 'hop', expression: randomItem([...EXPRESSIONS]) }
}

function duoTarget(action: DuoAction, index: number): Position {
  const pair: Record<DuoAction, [Position, Position]> = {
    chase: [{ x: 40, y: 78 }, { x: 59, y: 78 }],
    spar: [{ x: 44, y: 76 }, { x: 57, y: 76 }],
    highfive: [{ x: 47, y: 72 }, { x: 54, y: 72 }],
    dance: [{ x: 44, y: 75 }, { x: 57, y: 75 }],
    steal: [{ x: 47, y: 78 }, { x: 57, y: 78 }],
    race: [{ x: 22, y: index ? 83 : 78 }, { x: 22, y: index ? 83 : 78 }],
    nap: [{ x: 46, y: 86 }, { x: 56, y: 86 }],
    stare: [{ x: 47, y: 74 }, { x: 55, y: 74 }],
  }
  return pair[action][index]
}

function duoExpression(action: DuoAction, index: number): Expression {
  const pair: Record<DuoAction, [Expression, Expression]> = {
    chase: ['excited','scared'], spar: ['determined','angry'], highfive: ['happy','celebrate'], dance: ['dance','laugh'],
    steal: ['sneaky','shocked'], race: ['determined','excited'], nap: ['sleepy','sleepy'], stare: ['curious','confused'],
  }
  return pair[action][index]
}

function Rope({ edge, length, styleName }: { edge: DangleEdge; length: number; styleName: string }) {
  const style = { '--rope-length': `${length}px` } as CSSProperties
  return <span className={`v3-rope v3-rope--${edge} v3-rope--${styleName}`} style={style} aria-hidden="true"><i /></span>
}

function CompanionActor({ index, settings, pro, duoEvent, onMessage }: { index: number; settings: GremlinSettings; pro: boolean; duoEvent: DuoEvent; onMessage: (message: string) => void }) {
  const prefs = useCompanionPrefs()
  const v3 = useCompanionV3Prefs()
  const personality = PERSONALITIES[settings.personality]
  const [position, setPosition] = useState<Position>(index ? { x: clamp(prefs.lastX - 12, 8, 92), y: clamp(prefs.lastY + 4, 10, 90) } : { x: prefs.lastX, y: prefs.lastY })
  const [expression, setExpression] = useState<Expression>('neutral')
  const [action, setAction] = useState('idle')
  const [speech, setSpeech] = useState(index ? 'friend mode.' : personality.lines[0])
  const [eye, setEye] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const dragDistance = useRef(0)
  const lastPointer = useRef({ x: 0, y: 0, time: 0 })
  const velocity = useRef({ x: 0, y: 0 })
  const throwFrame = useRef<number | null>(null)
  const actionTimer = useRef<number | null>(null)
  const lastTap = useRef(0)

  const ropeLength = ropePixels(v3.ropeLength)
  const character = prefs.character === 'custom' && !pro ? 'gremlin' : prefs.character

  const customStyle = useMemo(() => ({
    '--custom-primary': prefs.customPrimary,
    '--custom-secondary': prefs.customSecondary,
  }) as CSSProperties, [prefs.customPrimary, prefs.customSecondary])

  useEffect(() => {
    if (prefs.movementMode === 'parked') {
      setPosition(index ? { x: clamp(prefs.lastX + 9, 8, 92), y: prefs.lastY } : { x: prefs.lastX, y: prefs.lastY })
      setAction('parked')
      setExpression('focused')
      return
    }
    if (prefs.movementMode === 'dangle') {
      setPosition(danglePosition(prefs.dangleEdge, { x: prefs.lastX, y: prefs.lastY }, ropeLength, index))
      setAction(`dangle-${prefs.dangleEdge}`)
      setExpression(index ? 'curious' : 'happy')
    }
  }, [index, prefs.dangleEdge, prefs.lastX, prefs.lastY, prefs.movementMode, ropeLength])

  useEffect(() => {
    if (!duoEvent || !pro || prefs.movementMode !== 'free') return
    if (actionTimer.current !== null) window.clearTimeout(actionTimer.current)
    setPosition(duoTarget(duoEvent.action, index))
    setExpression(duoExpression(duoEvent.action, index))
    setAction(`duo-${duoEvent.action}`)
    const lines: Record<DuoAction, [string,string]> = {
      chase: ['come back!','nope nope nope.'], spar: ['tiny duel.','en garde-ish.'], highfive: ['team!','BONK FIVE.'], dance: ['dance break.','my turn.'],
      steal: ['mine now.','HEY!'], race: ['race you.','boosting!'], nap: ['truce?','truce.'], stare: ['...','why are you looking at me?'],
    }
    setSpeech(lines[duoEvent.action][index])
    actionTimer.current = window.setTimeout(() => { setAction('idle'); setExpression('neutral') }, 2700)
  }, [duoEvent, index, prefs.movementMode, pro])

  useEffect(() => {
    if (settings.paused || prefs.movementMode !== 'free') return
    const base = settings.intensity === 'chill' ? 7200 : settings.intensity === 'chaos' ? 3100 : 5000
    const timer = window.setInterval(() => {
      if (dragging.current || duoEvent) return
      const next = naturalTarget()
      setPosition(next.position)
      if (index === 0) writeCompanionPrefs({ lastX: next.position.x, lastY: next.position.y })
      setAction(next.action)
      setExpression(next.expression)
      setSpeech(Math.random() > .55 ? randomItem(personality.lines) : '')
      if (actionTimer.current !== null) window.clearTimeout(actionTimer.current)
      actionTimer.current = window.setTimeout(() => { setAction('idle'); setExpression('neutral') }, 1600)
    }, base + index * 450)
    return () => window.clearInterval(timer)
  }, [duoEvent, index, personality.lines, prefs.movementMode, settings.intensity, settings.paused])

  useEffect(() => () => {
    if (throwFrame.current !== null) window.cancelAnimationFrame(throwFrame.current)
    if (actionTimer.current !== null) window.clearTimeout(actionTimer.current)
  }, [])

  function point(event: ReactPointerEvent<HTMLButtonElement>): Position {
    return {
      x: clamp((event.clientX / Math.max(1, window.innerWidth)) * 100, 4.5, 95.5),
      y: clamp((event.clientY / Math.max(1, window.innerHeight)) * 100, 6, 94),
    }
  }

  function pointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return
    if (throwFrame.current !== null) window.cancelAnimationFrame(throwFrame.current)
    dragging.current = true
    dragDistance.current = 0
    lastPointer.current = { x: event.clientX, y: event.clientY, time: performance.now() }
    velocity.current = { x: 0, y: 0 }
    event.currentTarget.setPointerCapture(event.pointerId)
    setAction('dragged')
    setExpression('shocked')
    setSpeech('whoa—')
    window.screenGremlin?.setInteractive(true)
  }

  function pointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragging.current) {
      const rect = event.currentTarget.getBoundingClientRect()
      const x = clamp(((event.clientX - rect.left) / Math.max(1, rect.width) - .5) * 5, -2.2, 2.2)
      const y = clamp(((event.clientY - rect.top) / Math.max(1, rect.height) - .5) * 4, -1.8, 1.8)
      setEye({ x, y })
      return
    }
    const now = performance.now()
    const dt = Math.max(8, now - lastPointer.current.time)
    const dx = event.clientX - lastPointer.current.x
    const dy = event.clientY - lastPointer.current.y
    dragDistance.current += Math.hypot(dx, dy)
    velocity.current = { x: dx / dt, y: dy / dt }
    lastPointer.current = { x: event.clientX, y: event.clientY, time: now }
    setPosition(point(event))
  }

  function openQuick(event: ReactPointerEvent<HTMLButtonElement>) {
    const now = performance.now()
    const doubleTap = now - lastTap.current < 330
    lastTap.current = now
    if (doubleTap) {
      setAction('jump')
      setExpression('excited')
      setSpeech(randomItem(['WHEE!','hi!','boing.']))
      window.setTimeout(() => { setAction(prefs.movementMode === 'parked' ? 'parked' : 'idle'); setExpression('neutral') }, 900)
      return
    }
    setAction('hello')
    setExpression('happy')
    setSpeech('what do you need?')
    window.dispatchEvent(new CustomEvent('screen-gremlin:quick-open', { detail: { x: event.clientX, y: event.clientY } }))
    window.setTimeout(() => { if (prefs.movementMode !== 'dangle') setExpression('neutral') }, 1200)
  }

  function pointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragging.current) return
    dragging.current = false
    try { event.currentTarget.releasePointerCapture(event.pointerId) } catch { /* already released */ }
    const current = point(event)
    if (index === 0) writeCompanionPrefs({ lastX: current.x, lastY: current.y })

    if (dragDistance.current < 6) {
      setPosition(prefs.movementMode === 'dangle' ? danglePosition(prefs.dangleEdge, { x: prefs.lastX, y: prefs.lastY }, ropeLength, index) : position)
      openQuick(event)
      return
    }

    if (prefs.movementMode === 'parked') {
      setPosition(current)
      setAction('parked')
      setExpression('focused')
      onMessage('Parked exactly here. Drag me again whenever you want.')
      return
    }

    if (prefs.movementMode === 'dangle') {
      const edge = nearestEdge(current)
      if (index === 0) writeCompanionPrefs({ dangleEdge: edge, lastX: current.x, lastY: current.y })
      setPosition(danglePosition(edge, current, ropeLength, index))
      setAction(`dangle-${edge}`)
      setExpression('happy')
      onMessage(`Rope attached to the ${edge} edge.`)
      return
    }

    let vx = velocity.current.x
    let vy = velocity.current.y
    setAction('thrown')
    setExpression('dizzy')
    setSpeech('WHEE—')
    let previous = performance.now()
    let elapsed = 0
    const animate = (now: number) => {
      const dt = Math.min(34, now - previous)
      previous = now
      elapsed += dt
      vx *= Math.pow(.94, dt / 16.67)
      vy *= Math.pow(.94, dt / 16.67)
      setPosition((before) => {
        let x = before.x + (vx * dt / Math.max(1, window.innerWidth)) * 100
        let y = before.y + (vy * dt / Math.max(1, window.innerHeight)) * 100
        if (x <= 5 || x >= 95) vx *= -.58
        if (y <= 7 || y >= 92) vy *= -.58
        x = clamp(x, 5, 95)
        y = clamp(y, 7, 92)
        if (index === 0 && elapsed > 820) writeCompanionPrefs({ lastX: x, lastY: y })
        return { x, y }
      })
      if (elapsed < 1000 && Math.hypot(vx, vy) > .025) throwFrame.current = window.requestAnimationFrame(animate)
      else {
        setAction('land')
        setExpression('annoyed')
        throwFrame.current = null
        window.setTimeout(() => { setAction('idle'); setExpression('neutral') }, 700)
      }
    }
    throwFrame.current = window.requestAnimationFrame(animate)
  }

  return (
    <button
      type="button"
      className={`gremlin companion-character companion-v3 companion-action--${action}`}
      data-character={character}
      data-expression={expression}
      style={{ ...customStyle, left: `${position.x}%`, top: `${position.y}%` }}
      onPointerEnter={() => { window.screenGremlin?.setInteractive(true); if (!dragging.current && prefs.movementMode !== 'dangle') { setExpression('curious'); setAction('wave') } }}
      onPointerLeave={() => { setEye({ x: 0, y: 0 }); if (!dragging.current) { if (prefs.movementMode === 'free') { setExpression('neutral'); setAction('idle') } window.screenGremlin?.setInteractive(false) } }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
      aria-label={`${settings.name}${index ? ' two' : ''}. Click for quick actions, drag to move, right-click for controls.`}
    >
      {prefs.movementMode === 'dangle' && v3.ropeEnabled && <Rope edge={prefs.dangleEdge} length={ropeLength} styleName={v3.ropeStyle} />}
      {settings.speech && speech && <span className="companion-speech v3-speech">{speech}</span>}
      <CharacterArtV3
        character={character}
        expression={expression}
        accessory={settings.accessory}
        customPrimary={prefs.customPrimary}
        customSecondary={prefs.customSecondary}
        customShape={prefs.customShape}
        customEyes={prefs.customEyes}
        eyeX={eye.x}
        eyeY={eye.y}
        second={index === 1}
      />
    </button>
  )
}

export default function DesktopCompanionV3() {
  const state = useDesktopState()
  const prefs = useCompanionPrefs()
  const settings = state?.settings
  const [message, setMessage] = useState<string | null>(null)
  const [duoEvent, setDuoEvent] = useState<DuoEvent>(null)
  const messageTimer = useRef<number | null>(null)

  function showMessage(text: string) {
    setMessage(text)
    if (messageTimer.current !== null) window.clearTimeout(messageTimer.current)
    messageTimer.current = window.setTimeout(() => setMessage(null), 2600)
  }

  useEffect(() => {
    if (!settings || !state?.pro || !settings.duo || settings.paused || prefs.movementMode !== 'free') return
    const timer = window.setInterval(() => {
      const action = randomItem(DUO_ACTIONS)
      setDuoEvent({ id: Date.now(), action })
      window.setTimeout(() => setDuoEvent(null), 3100)
    }, 10_500)
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
    const timer = window.setInterval(check, 20_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => () => {
    if (messageTimer.current !== null) window.clearTimeout(messageTimer.current)
  }, [])

  if (!state || !settings) return null

  return <>
    {message && <div className="companion-v3-toast" role="status">{message}</div>}
    <CompanionActor index={0} settings={settings} pro={state.pro} duoEvent={duoEvent} onMessage={showMessage}/>
    {settings.duo && state.pro && <CompanionActor index={1} settings={settings} pro={state.pro} duoEvent={duoEvent} onMessage={showMessage}/>} 
  </>
}
