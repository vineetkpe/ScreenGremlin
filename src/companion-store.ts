import { useEffect, useState } from 'react'

export type CharacterId = 'gremlin' | 'pebblebot' | 'mossling' | 'bloop' | 'nimbus' | 'bytebug' | 'wisp' | 'mooncat' | 'custom'
export type MovementMode = 'free' | 'parked' | 'dangle'
export type DangleEdge = 'top' | 'right' | 'bottom' | 'left'
export type CustomShape = 'round' | 'tall' | 'square'
export type CustomEyes = 'dot' | 'wide' | 'sleepy'

export type CompanionPrefs = {
  character: CharacterId
  movementMode: MovementMode
  lastX: number
  lastY: number
  dangleEdge: DangleEdge
  customPrimary: string
  customSecondary: string
  customShape: CustomShape
  customEyes: CustomEyes
}

export type NoteItem = { id: string; text: string; createdAt: number }
export type TodoItem = { id: string; text: string; done: boolean; createdAt: number }
export type ReminderItem = { id: string; text: string; dueAt: number; fired: boolean; createdAt: number }
export type SnippetItem = { id: string; text: string; createdAt: number }

export type ProductivityData = {
  notes: NoteItem[]
  todos: TodoItem[]
  reminders: ReminderItem[]
  snippets: SnippetItem[]
}

const PREFS_KEY = 'screen-gremlin:companion-prefs:v1'
const DATA_KEY = 'screen-gremlin:productivity:v1'
const STORE_EVENT = 'screen-gremlin:local-store'

export const CHARACTER_LIBRARY: Array<{ id: CharacterId; name: string; description: string; pro: boolean }> = [
  { id: 'gremlin', name: 'Mimi', description: 'A warm, playful original desktop friend with expressive reactions.', pro: false },
  { id: 'pebblebot', name: 'Rex', description: 'A confident, laid-back original desktop buddy with sharper styling.', pro: false },
  { id: 'mossling', name: 'Mossling', description: 'A small leafy creature with its own original silhouette.', pro: true },
  { id: 'bloop', name: 'Bloop', description: 'A soft blob that treats gravity as optional.', pro: true },
  { id: 'nimbus', name: 'Nimbus', description: 'A tiny storm-cloud companion.', pro: true },
  { id: 'bytebug', name: 'Bytebug', description: 'A pixel-minded desktop critter.', pro: true },
  { id: 'wisp', name: 'Wisp', description: 'A floating glow-creature with a long tail.', pro: true },
  { id: 'mooncat', name: 'Mooncat', description: 'A sleepy space-cat-like original companion.', pro: true },
  { id: 'custom', name: 'Your Character', description: 'Build an original companion from shapes, colors, and eyes.', pro: true },
]

export const EXPRESSIONS = [
  'neutral', 'happy', 'laugh', 'teasing', 'smug', 'annoyed', 'angry', 'sleepy', 'shocked', 'scared', 'confused', 'curious',
  'proud', 'excited', 'bored', 'sneaky', 'dizzy', 'sad', 'thinking', 'hungry', 'celebrate', 'dance',
  'facepalm', 'embarrassed', 'focused', 'mischief', 'love', 'determined',
] as const
export type Expression = typeof EXPRESSIONS[number]

export const DEFAULT_COMPANION_PREFS: CompanionPrefs = {
  character: 'gremlin',
  movementMode: 'free',
  lastX: 70,
  lastY: 58,
  dangleEdge: 'top',
  customPrimary: '#b2ff59',
  customSecondary: '#202024',
  customShape: 'round',
  customEyes: 'dot',
}

export const DEFAULT_PRODUCTIVITY: ProductivityData = { notes: [], todos: [], reminders: [], snippets: [] }

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try { return JSON.parse(raw) as T } catch { return fallback }
}

function clamp(value: unknown, fallback: number) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(95, Math.max(5, number)) : fallback
}

export function readCompanionPrefs(): CompanionPrefs {
  const parsed = safeJson<Partial<CompanionPrefs>>(localStorage.getItem(PREFS_KEY), {})
  const validCharacter = CHARACTER_LIBRARY.some((item) => item.id === parsed.character) ? parsed.character! : DEFAULT_COMPANION_PREFS.character
  return {
    ...DEFAULT_COMPANION_PREFS,
    ...parsed,
    character: validCharacter,
    movementMode: ['free', 'parked', 'dangle'].includes(String(parsed.movementMode)) ? parsed.movementMode! : 'free',
    dangleEdge: ['top', 'right', 'bottom', 'left'].includes(String(parsed.dangleEdge)) ? parsed.dangleEdge! : 'top',
    lastX: clamp(parsed.lastX, DEFAULT_COMPANION_PREFS.lastX),
    lastY: clamp(parsed.lastY, DEFAULT_COMPANION_PREFS.lastY),
  }
}

export function writeCompanionPrefs(patch: Partial<CompanionPrefs>) {
  const next = { ...readCompanionPrefs(), ...patch }
  localStorage.setItem(PREFS_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent(STORE_EVENT))
  return next
}

export function readProductivity(): ProductivityData {
  const parsed = safeJson<Partial<ProductivityData>>(localStorage.getItem(DATA_KEY), {})
  return {
    notes: Array.isArray(parsed.notes) ? parsed.notes.slice(0, 300) : [],
    todos: Array.isArray(parsed.todos) ? parsed.todos.slice(0, 300) : [],
    reminders: Array.isArray(parsed.reminders) ? parsed.reminders.slice(0, 300) : [],
    snippets: Array.isArray(parsed.snippets) ? parsed.snippets.slice(0, 300) : [],
  }
}

export function writeProductivity(next: ProductivityData) {
  localStorage.setItem(DATA_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent(STORE_EVENT))
  return next
}

function id(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function addNote(text: string) {
  const clean = text.trim().slice(0, 4000)
  if (!clean) return readProductivity()
  const data = readProductivity()
  return writeProductivity({ ...data, notes: [{ id: id('note'), text: clean, createdAt: Date.now() }, ...data.notes].slice(0, 300) })
}

export function addTodo(text: string) {
  const clean = text.trim().slice(0, 500)
  if (!clean) return readProductivity()
  const data = readProductivity()
  return writeProductivity({ ...data, todos: [{ id: id('todo'), text: clean, done: false, createdAt: Date.now() }, ...data.todos].slice(0, 300) })
}

export function toggleTodo(todoId: string) {
  const data = readProductivity()
  return writeProductivity({ ...data, todos: data.todos.map((item) => item.id === todoId ? { ...item, done: !item.done } : item) })
}

export function addReminder(text: string, dueAt: number) {
  const clean = text.trim().slice(0, 500)
  if (!clean || !Number.isFinite(dueAt) || dueAt <= Date.now()) return readProductivity()
  const data = readProductivity()
  return writeProductivity({ ...data, reminders: [{ id: id('rem'), text: clean, dueAt, fired: false, createdAt: Date.now() }, ...data.reminders].slice(0, 300) })
}

export function markReminderFired(reminderId: string) {
  const data = readProductivity()
  return writeProductivity({ ...data, reminders: data.reminders.map((item) => item.id === reminderId ? { ...item, fired: true } : item) })
}

export function addSnippet(text: string) {
  const clean = text.trim().slice(0, 8000)
  if (!clean) return readProductivity()
  const data = readProductivity()
  return writeProductivity({ ...data, snippets: [{ id: id('clip'), text: clean, createdAt: Date.now() }, ...data.snippets].slice(0, 300) })
}

export function deleteProductivityItem(kind: keyof ProductivityData, itemId: string) {
  const data = readProductivity()
  const next = { ...data, [kind]: data[kind].filter((item) => item.id !== itemId) } as ProductivityData
  return writeProductivity(next)
}

export function parseQuickCommand(command: string): { message: string; data: ProductivityData } {
  const raw = command.trim()
  const lower = raw.toLowerCase()
  if (!raw) return { message: 'Type a note, todo, reminder, or snippet command.', data: readProductivity() }

  if (lower.startsWith('note ')) return { message: 'Note saved locally.', data: addNote(raw.slice(5)) }
  if (lower.startsWith('todo ')) return { message: 'Todo added.', data: addTodo(raw.slice(5)) }
  if (lower.startsWith('snippet ')) return { message: 'Snippet saved.', data: addSnippet(raw.slice(8)) }

  const reminder = raw.match(/^remind\s+(\d+)\s*(m|min|mins|h|hr|hrs)\s+(.+)$/i)
  if (reminder) {
    const amount = Math.max(1, Math.min(1440, Number(reminder[1])))
    const multiplier = reminder[2].toLowerCase().startsWith('h') ? 60 : 1
    return { message: `Reminder set for ${amount}${multiplier === 60 ? 'h' : 'm'}.`, data: addReminder(reminder[3], Date.now() + amount * multiplier * 60_000) }
  }

  return { message: 'Try “note …”, “todo …”, “remind 30m …”, or “snippet …”.', data: readProductivity() }
}

function useStoreSnapshot<T>(reader: () => T) {
  const [value, setValue] = useState(reader)
  useEffect(() => {
    const refresh = () => setValue(reader())
    window.addEventListener(STORE_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(STORE_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [reader])
  return value
}

export function useCompanionPrefs() {
  return useStoreSnapshot(readCompanionPrefs)
}

export function useProductivity() {
  return useStoreSnapshot(readProductivity)
}
