import { useEffect, useMemo, useRef, useState } from 'react'
import CharacterArtV3 from './CharacterArtV3'
import { parseQuickCommand, useCompanionPrefs, type Expression } from './companion-store'
import { respondLocally, type FriendExpression, type FriendLanguage } from './friend-brain'

type VoiceStyle = 'female' | 'male' | 'cute' | 'calm'
type FriendAction = 'play' | 'pat' | 'bonk' | 'quiet'
type ChatItem = { id: string; from: 'user' | 'friend'; text: string; expression?: FriendExpression }

type AgentReply = {
  ok: boolean
  reason?: string
  reply?: { text: string; expression?: FriendExpression; mood?: string; action?: FriendAction }
}

const PREF_KEY = 'screen-gremlin:friend-prefs:v1'
const CHAT_KEY = 'screen-gremlin:friend-chat:v1'

type FriendPrefs = {
  language: FriendLanguage
  voiceStyle: VoiceStyle
  speakReplies: boolean
}

const defaults: FriendPrefs = { language: 'hinglish', voiceStyle: 'cute', speakReplies: true }

function readPrefs(): FriendPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREF_KEY) || '{}')
    return {
      language: ['en', 'hi', 'hinglish'].includes(raw.language) ? raw.language : defaults.language,
      voiceStyle: ['female', 'male', 'cute', 'calm'].includes(raw.voiceStyle) ? raw.voiceStyle : defaults.voiceStyle,
      speakReplies: typeof raw.speakReplies === 'boolean' ? raw.speakReplies : defaults.speakReplies,
    }
  } catch {
    return defaults
  }
}

function readChat(): ChatItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CHAT_KEY) || '[]')
    return Array.isArray(raw) ? raw.slice(-30) : []
  } catch {
    return []
  }
}

function saveChat(items: ChatItem[]) {
  localStorage.setItem(CHAT_KEY, JSON.stringify(items.slice(-30)))
}

function langCode(language: FriendLanguage) {
  return language === 'en' ? 'en-IN' : 'hi-IN'
}

function speak(text: string, prefs: FriendPrefs) {
  if (!prefs.speakReplies || !('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = langCode(prefs.language)
    const voices = window.speechSynthesis.getVoices()
    const sameLanguage = voices.filter((voice) => voice.lang.toLowerCase().startsWith(utterance.lang.slice(0, 2).toLowerCase()))
    const named = sameLanguage.find((voice) => {
      const name = voice.name.toLowerCase()
      if (prefs.voiceStyle === 'female') return /female|woman|heera|swara|zira|veena/.test(name)
      if (prefs.voiceStyle === 'male') return /male|man|ravi|hemant|prabhat/.test(name)
      return false
    })
    utterance.voice = named || sameLanguage[0] || null
    if (prefs.voiceStyle === 'cute') { utterance.pitch = 1.28; utterance.rate = 1.04 }
    if (prefs.voiceStyle === 'calm') { utterance.pitch = 0.95; utterance.rate = 0.88 }
    if (prefs.voiceStyle === 'male') utterance.pitch = 0.9
    if (prefs.voiceStyle === 'female') utterance.pitch = 1.08
    utterance.volume = 0.8
    window.speechSynthesis.speak(utterance)
  } catch {
    // Voice is optional; chat must continue even if the OS voice engine fails.
  }
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function visualExpression(expression: FriendExpression): Expression {
  if (expression === 'teasing') return 'mischief'
  if (expression === 'smug') return 'proud'
  return expression
}

export default function FriendBubble() {
  const companion = useCompanionPrefs()
  const [prefs, setPrefs] = useState<FriendPrefs>(readPrefs)
  const [chat, setChat] = useState<ChatItem[]>(readChat)
  const [draft, setDraft] = useState('')
  const [expression, setExpression] = useState<FriendExpression>('happy')
  const [agentConfigured, setAgentConfigured] = useState(false)
  const [thinking, setThinking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const character = companion.character
  const title = useMemo(() => prefs.language === 'hi' ? 'Tumhara desktop dost' : prefs.language === 'hinglish' ? 'Your desktop dost' : 'Your desktop friend', [prefs.language])

  useEffect(() => {
    inputRef.current?.focus()
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80)
    const api = window.screenGremlinFriend
    if (api) void api.getAgentStatus().then((status) => setAgentConfigured(Boolean(status?.configured)))
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs))
  }, [prefs])

  useEffect(() => {
    saveChat(chat)
    bottomRef.current?.scrollIntoView({ block: 'nearest' })
  }, [chat])

  function addReply(text: string, nextExpression: FriendExpression) {
    setExpression(nextExpression)
    const item: ChatItem = { id: uid(), from: 'friend', text, expression: nextExpression }
    setChat((before) => [...before, item])
    speak(text, prefs)
  }

  function triggerAction(action?: FriendAction) {
    if (!action) return
    void window.screenGremlinFriend?.triggerAction(action, prefs.language)
  }

  async function submit() {
    const text = draft.trim().slice(0, 1200)
    if (!text || thinking) return
    setDraft('')
    const userItem: ChatItem = { id: uid(), from: 'user', text }
    const snapshot = [...chat, userItem]
    setChat(snapshot)

    const lower = text.toLowerCase()
    const looksLikeUtility = /^(note|todo|snippet|remind)\s+/.test(lower)
    if (looksLikeUtility) {
      const result = parseQuickCommand(text)
      addReply(result.message, result.message.startsWith('Try') ? 'thinking' : 'happy')
      return
    }

    setThinking(true)
    setExpression('thinking')
    try {
      const api = window.screenGremlinFriend
      const agentResult = api ? await api.chat({
        message: text,
        language: prefs.language,
        voiceStyle: prefs.voiceStyle,
        history: snapshot.slice(-12).map((item) => ({ role: item.from === 'friend' ? 'assistant' : 'user', text: item.text })),
      }) as AgentReply : undefined

      if (agentResult?.ok && agentResult.reply?.text) {
        const nextExpression = agentResult.reply.expression || 'happy'
        addReply(agentResult.reply.text, nextExpression)
        triggerAction(agentResult.reply.action)
        localStorage.setItem('screen-gremlin:friend-last-emotion:v1', JSON.stringify({ mood: agentResult.reply.mood || 'happy', expression: nextExpression, at: Date.now() }))
        return
      }

      const fallback = respondLocally(text, prefs.language)
      addReply(fallback.text, fallback.expression)
      if (fallback.action === 'play') triggerAction('play')
      if (fallback.action === 'quiet') triggerAction('quiet')
      localStorage.setItem('screen-gremlin:friend-last-emotion:v1', JSON.stringify({ mood: fallback.mood, expression: fallback.expression, at: Date.now() }))
    } finally {
      setThinking(false)
      window.setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  function clearChat() {
    setChat([])
    localStorage.removeItem(CHAT_KEY)
    setExpression('happy')
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <main className="friend-window">
      <header className="friend-window__head">
        <div className="friend-window__avatar" aria-hidden="true">
          <CharacterArtV3
            character={character}
            expression={visualExpression(expression)}
            accessory="none"
            customPrimary={companion.customPrimary}
            customSecondary={companion.customSecondary}
            customShape={companion.customShape}
            customEyes={companion.customEyes}
          />
        </div>
        <div><strong>{title}</strong><span>{thinking ? 'thinking…' : expression}</span></div>
        <button className="friend-window__close" type="button" aria-label="Close friend chat" onClick={() => void window.screenGremlinFriend?.close()}>×</button>
      </header>

      <section className="friend-window__prefs" aria-label="Friend preferences">
        <select value={prefs.language} onChange={(event) => setPrefs((before) => ({ ...before, language: event.target.value as FriendLanguage }))}>
          <option value="hinglish">Hinglish</option>
          <option value="hi">Hindi</option>
          <option value="en">English</option>
        </select>
        <select value={prefs.voiceStyle} onChange={(event) => setPrefs((before) => ({ ...before, voiceStyle: event.target.value as VoiceStyle }))}>
          <option value="cute">Cute voice</option>
          <option value="female">Female-style</option>
          <option value="male">Male-style</option>
          <option value="calm">Calm voice</option>
        </select>
        <button type="button" className={prefs.speakReplies ? 'is-on' : ''} onClick={() => setPrefs((before) => ({ ...before, speakReplies: !before.speakReplies }))}>{prefs.speakReplies ? 'Voice on' : 'Voice off'}</button>
      </section>

      <section className="friend-window__chat" aria-live="polite">
        {chat.length === 0 && <div className="friend-window__welcome">
          <strong>Talk normally.</strong>
          <span>Try “play with me”, “pakdo mujhe”, “todo finish project”, or just tell me about your day.</span>
        </div>}
        {chat.map((item) => <div key={item.id} className={`friend-msg friend-msg--${item.from}`}><span>{item.text}</span></div>)}
        {thinking && <div className="friend-msg friend-msg--friend"><span>…</span></div>}
        <div ref={bottomRef} />
      </section>

      <section className="friend-window__quick">
        <button type="button" onClick={() => { setDraft('play with me'); inputRef.current?.focus() }}>Play</button>
        <button type="button" onClick={() => { setDraft('todo '); inputRef.current?.focus() }}>Todo</button>
        <button type="button" onClick={() => { setDraft('note '); inputRef.current?.focus() }}>Note</button>
        <button type="button" onClick={() => { setDraft('remind 30m '); inputRef.current?.focus() }}>Reminder</button>
      </section>

      <form className="friend-window__composer" onSubmit={(event) => { event.preventDefault(); void submit() }}>
        <input ref={inputRef} autoFocus disabled={thinking} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={prefs.language === 'hinglish' ? 'Bol, kya scene hai?' : prefs.language === 'hi' ? 'Bolo…' : 'Talk to me…'} maxLength={1200} />
        <button type="submit" disabled={thinking}>Send</button>
      </form>
      <footer><button type="button" onClick={clearChat}>Clear chat</button><span>{agentConfigured ? 'AI friend service connected' : 'Offline friend brain'}</span></footer>
    </main>
  )
}