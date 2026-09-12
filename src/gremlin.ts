export type Intensity = 'chill' | 'normal' | 'chaos'
export type Theme = 'lime' | 'pink' | 'ice' | 'purple'
export type Personality = 'cute' | 'savage' | 'lazy' | 'chaotic' | 'gamer' | 'office'
export type Accessory = 'none' | 'cap' | 'glasses' | 'headphones' | 'crown'
export type Toy = 'ball' | 'snack'
export type Behavior =
  | 'idle'
  | 'wander'
  | 'peek'
  | 'taunt'
  | 'caught'
  | 'nap'
  | 'zoom'
  | 'dance'
  | 'spin'
  | 'trip'
  | 'dragged'
  | 'thrown'
  | 'toy'

export type GremlinSettings = {
  paused: boolean
  intensity: Intensity
  speech: boolean
  notices: boolean
  theme: Theme
  startAtLogin: boolean
  allDisplays: boolean
  alwaysOnTop: boolean
  name: string
  personality: Personality
  accessory: Accessory
  sounds: boolean
  duo: boolean
  rareAnimations: boolean
  fullscreenSafe: boolean
  focusUntil: number | null
}

export type LicenseInfo = {
  id: string
  owner: string
  tier: 'pro'
  issuedAt: string | null
  expiresAt: string | null
}

export type AppState = {
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

export type Position = { x: number; y: number }

export const DEFAULT_SETTINGS: GremlinSettings = {
  paused: false,
  intensity: 'normal',
  speech: true,
  notices: true,
  theme: 'lime',
  startAtLogin: false,
  allDisplays: true,
  alwaysOnTop: true,
  name: 'Gremlin',
  personality: 'cute',
  accessory: 'none',
  sounds: false,
  duo: false,
  rareAnimations: true,
  fullscreenSafe: true,
  focusUntil: null,
}

export const themeColors: Record<Theme, string> = {
  lime: '#b2ff59',
  pink: '#ff7ad9',
  ice: '#79e6ff',
  purple: '#b69cff',
}

export const PERSONALITIES: Record<
  Personality,
  { label: string; description: string; pro: boolean; lines: string[]; reactions: string[] }
> = {
  cute: {
    label: 'Cute',
    description: 'Tiny compliments, naps, and harmless chaos.',
    pro: false,
    lines: ['hi hi.', 'tiny break?', 'your desktop is cozy.', 'i brought zero problems. probably.'],
    reactions: ['eep!', 'you found me!', 'okay okay!', 'boop accepted.'],
  },
  office: {
    label: 'Office',
    description: 'Meeting jokes and productivity supervision.',
    pro: false,
    lines: ['that meeting could be an email.', 'productivity detected.', 'calendar says no.', 'nice spreadsheet.'],
    reactions: ['HR has been notified.', 'adding this to the minutes.', 'action item: stop poking me.', 'noted.'],
  },
  savage: {
    label: 'Savage',
    description: 'Sharper jokes, still friendly and non-personal.',
    pro: true,
    lines: ['bold tab count.', 'that shortcut was ambitious.', 'your desktop has lore.', 'confidence: maximum. plan: pending.'],
    reactions: ['rude.', 'absolutely unnecessary.', 'you chose violence.', 'i will remember this for seven seconds.'],
  },
  lazy: {
    label: 'Lazy',
    description: 'Mostly naps. Occasionally judges effort.',
    pro: true,
    lines: ['five more minutes.', 'wake me when it compiles.', 'busy doing nothing.', 'that looked exhausting.'],
    reactions: ['too much movement.', 'please file a request.', 'nap interrupted.', 'unacceptable energy.'],
  },
  chaotic: {
    label: 'Chaotic',
    description: 'More sprints, spins, and surprise animations.',
    pro: true,
    lines: ['new plan: no plan.', 'catch me.', 'i moved one pixel. historic.', 'maximum gremlin.'],
    reactions: ['WHEE.', 'again!', 'you activated chaos.', 'excellent decision.'],
  },
  gamer: {
    label: 'Gamer',
    description: 'Respawns, cooldowns, and fake victory chatter.',
    pro: true,
    lines: ['cooldown ready.', 'side quest unlocked.', 'desktop boss fight soon.', 'saving progress... probably.'],
    reactions: ['critical boop.', 'controller disconnected.', 'respawning.', 'achievement unlocked.'],
  },
}

export const ACCESSORIES: Array<{ id: Accessory; label: string; pro: boolean }> = [
  { id: 'none', label: 'Classic', pro: false },
  { id: 'cap', label: 'Cap', pro: false },
  { id: 'glasses', label: 'Glasses', pro: true },
  { id: 'headphones', label: 'Headphones', pro: true },
  { id: 'crown', label: 'Crown', pro: true },
]

export const notices = [
  'Gremlin inspected your productivity.',
  'One suspicious pixel has been relocated.',
  'Gremlin claims this corner now.',
  'Nothing was broken. Probably.',
  'A meeting could have been an email.',
]

export function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

export function randomPosition(seed = Math.random()): Position {
  const second = (seed * 7.37) % 1
  return { x: 9 + seed * 76, y: 15 + second * 68 }
}

export function edgePosition(): Position {
  return { x: Math.random() > 0.5 ? 3 : 97, y: 22 + Math.random() * 56 }
}

export function isFocusActive(settings: GremlinSettings, now = Date.now()): boolean {
  return typeof settings.focusUntil === 'number' && settings.focusUntil > now
}

export function safeGremlinName(value: string): string {
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 24)
  return cleaned || 'Gremlin'
}
