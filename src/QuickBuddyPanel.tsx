import { useEffect, useMemo, useRef, useState } from 'react'
import { addNote, addReminder, addSnippet, addTodo, parseQuickCommand, readProductivity } from './companion-store'

type OpenDetail = { x: number; y: number }
type Position = OpenDetail | null

type QuickMode = 'command' | 'note' | 'todo' | 'reminder' | 'snippet'

function reminderLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  return `${Math.round(minutes / 60)} hr`
}

export default function QuickBuddyPanel() {
  const [position, setPosition] = useState<Position>(null)
  const [mode, setMode] = useState<QuickMode>('command')
  const [value, setValue] = useState('')
  const [status, setStatus] = useState('')
  const [reminderMinutes, setReminderMinutes] = useState(30)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const open = (event: Event) => {
      const detail = (event as CustomEvent<OpenDetail>).detail
      if (!detail || !Number.isFinite(detail.x) || !Number.isFinite(detail.y)) return
      window.screenGremlin?.setInteractive(true)
      setPosition(detail)
      setMode('command')
      setStatus('')
      window.setTimeout(() => inputRef.current?.focus(), 30)
    }
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') closePanel() }
    window.addEventListener('screen-gremlin:quick-open', open as EventListener)
    window.addEventListener('keydown', close)
    return () => {
      window.removeEventListener('screen-gremlin:quick-open', open as EventListener)
      window.removeEventListener('keydown', close)
    }
  }, [])

  const style = useMemo(() => {
    if (!position) return undefined
    const width = 340
    const height = 238
    return {
      left: Math.max(12, Math.min(position.x + 14, window.innerWidth - width - 12)),
      top: Math.max(12, Math.min(position.y - 46, window.innerHeight - height - 12)),
    }
  }, [position])

  function closePanel() {
    setPosition(null)
    setValue('')
    setStatus('')
    window.setTimeout(() => window.screenGremlin?.setInteractive(false), 80)
  }

  function success(message: string) {
    setStatus(message)
    setValue('')
  }

  function submit() {
    const clean = value.trim()
    if (!clean) return
    if (mode === 'note') { addNote(clean); success('Saved as a note.'); return }
    if (mode === 'todo') { addTodo(clean); success('Added to your todos.'); return }
    if (mode === 'snippet') { addSnippet(clean); success('Saved to your snippet shelf.'); return }
    if (mode === 'reminder') {
      addReminder(clean, Date.now() + reminderMinutes * 60_000)
      success(`I’ll remind you in ${reminderLabel(reminderMinutes)}.`)
      return
    }
    const result = parseQuickCommand(clean)
    setStatus(result.message)
    if (!result.message.startsWith('Try') && !result.message.startsWith('Type')) setValue('')
  }

  async function saveClipboard() {
    try {
      const text = (await navigator.clipboard.readText()).trim()
      if (!text) { setStatus('Clipboard is empty.'); return }
      addSnippet(text)
      setStatus('Current clipboard saved as a snippet.')
    } catch {
      setMode('snippet')
      setStatus('Clipboard access was blocked. Press Ctrl+V here and save it.')
      window.setTimeout(() => inputRef.current?.focus(), 20)
    }
  }

  if (!position) return null
  const counts = readProductivity()
  const pending = counts.todos.filter((item) => !item.done).length

  return (
    <aside className="quick-buddy" style={style} onPointerEnter={() => window.screenGremlin?.setInteractive(true)} onPointerLeave={() => window.screenGremlin?.setInteractive(true)} aria-label="Quick companion actions">
      <header>
        <div><strong>Ask your companion</strong><small>{pending} open todo{pending === 1 ? '' : 's'} · everything stays local</small></div>
        <button type="button" onClick={closePanel} aria-label="Close">×</button>
      </header>

      <div className="quick-buddy__modes">
        {(['command','note','todo','reminder','snippet'] as QuickMode[]).map((item) => (
          <button key={item} type="button" className={mode === item ? 'is-active' : ''} onClick={() => { setMode(item); setStatus(''); window.setTimeout(() => inputRef.current?.focus(), 20) }}>{item}</button>
        ))}
      </div>

      {mode === 'reminder' && <div className="quick-buddy__times">
        {[10,30,60,120].map((minutes) => <button key={minutes} type="button" className={reminderMinutes === minutes ? 'is-active' : ''} onClick={() => setReminderMinutes(minutes)}>{reminderLabel(minutes)}</button>)}
      </div>}

      <form onSubmit={(event) => { event.preventDefault(); submit() }}>
        <input
          ref={inputRef}
          value={value}
          maxLength={mode === 'snippet' ? 8000 : mode === 'note' ? 4000 : 500}
          onChange={(event) => setValue(event.target.value)}
          placeholder={mode === 'command' ? 'Try: todo finish landing page' : mode === 'reminder' ? 'What should I remind you about?' : `Type a ${mode}…`}
        />
        <button type="submit">Save</button>
      </form>

      <div className="quick-buddy__footer">
        <button type="button" onClick={saveClipboard}>Save clipboard</button>
        <span>{status || 'Click me anytime — no dashboard required.'}</span>
      </div>
    </aside>
  )
}
