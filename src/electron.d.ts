type ScreenGremlinIntensity = 'chill' | 'normal' | 'chaos'
type ScreenGremlinTheme = 'lime' | 'pink' | 'ice' | 'purple'
type ScreenGremlinPersonality = 'cute' | 'savage' | 'lazy' | 'chaotic' | 'gamer' | 'office'
type ScreenGremlinAccessory = 'none' | 'cap' | 'glasses' | 'headphones' | 'crown'
type ScreenGremlinFriendAction = 'play' | 'pat' | 'bonk' | 'quiet'
type ScreenGremlinFriendLanguage = 'en' | 'hi' | 'hinglish'

type ScreenGremlinSettings = {
  paused: boolean
  intensity: ScreenGremlinIntensity
  speech: boolean
  notices: boolean
  theme: ScreenGremlinTheme
  startAtLogin: boolean
  allDisplays: boolean
  alwaysOnTop: boolean
  name: string
  personality: ScreenGremlinPersonality
  accessory: ScreenGremlinAccessory
  sounds: boolean
  duo: boolean
  rareAnimations: boolean
  fullscreenSafe: boolean
  focusUntil: number | null
}

type ScreenGremlinLicense = {
  id: string
  owner: string
  tier: 'pro'
  issuedAt: string | null
  expiresAt: string | null
}

type ScreenGremlinState = {
  settings: ScreenGremlinSettings
  pro: boolean
  license: ScreenGremlinLicense | null
  appVersion: string
  platform: string
  checkoutUrl: string
  priceUsd: string
  downloadUrl: string
  creatorUnlockUrl: string
}

type ScreenGremlinActivationResult =
  | { valid: true; state: ScreenGremlinState }
  | { valid: false; error: string }

type ScreenGremlinFriendChatInput = {
  message: string
  language: ScreenGremlinFriendLanguage
  voiceStyle: 'female' | 'male' | 'cute' | 'calm'
  history: Array<{ role: 'user' | 'assistant'; text: string }>
}

type ScreenGremlinFriendChatResult =
  | { ok: true; reply: { text: string; expression: string; mood: string; action?: ScreenGremlinFriendAction } }
  | { ok: false; reason: string }

interface Window {
  screenGremlin?: {
    getState(): Promise<ScreenGremlinState | null>
    updateSettings(patch: Partial<ScreenGremlinSettings>): Promise<ScreenGremlinState | null>
    activateLicense(key: string): Promise<ScreenGremlinActivationResult>
    deactivateLicense(): Promise<ScreenGremlinState | null>
    openExternal(url: string): Promise<boolean>
    openSettings(): Promise<boolean>
    closeSettings(): Promise<boolean>
    openFriend(anchor: { x: number; y: number }): Promise<boolean>
    quitApp(): Promise<boolean>
    setInteractive(interactive: boolean): void
    onStateChanged(callback: (state: ScreenGremlinState) => void): () => void
    onFriendAction(callback: (event: { action: ScreenGremlinFriendAction; language: ScreenGremlinFriendLanguage }) => void): () => void
  }
  screenGremlinFriend?: {
    close(): Promise<boolean>
    chat(input: ScreenGremlinFriendChatInput): Promise<ScreenGremlinFriendChatResult>
    getAgentStatus(): Promise<{ configured: boolean }>
    triggerAction(action: ScreenGremlinFriendAction, language: ScreenGremlinFriendLanguage): Promise<boolean>
  }
}