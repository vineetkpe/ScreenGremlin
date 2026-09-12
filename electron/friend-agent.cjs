const MAX_MESSAGE_CHARS = 1200
const MAX_REPLY_CHARS = 1800
const REQUEST_TIMEOUT_MS = 12000

function normalizeHttpsUrl(raw) {
  try {
    const value = String(raw || '').trim()
    if (!value) return null
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) return null
    return url.toString()
  } catch {
    return null
  }
}

function sanitizeLanguage(value) {
  return ['en', 'hi', 'hinglish'].includes(value) ? value : 'hinglish'
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return []
  return history.slice(-12).flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const role = item.role === 'assistant' ? 'assistant' : item.role === 'user' ? 'user' : null
    const text = String(item.text || '').trim().slice(0, MAX_MESSAGE_CHARS)
    return role && text ? [{ role, text }] : []
  })
}

function parseReply(payload) {
  const text = String(payload?.text || payload?.reply || '').trim().slice(0, MAX_REPLY_CHARS)
  if (!text) return null
  const allowedExpressions = new Set(['neutral','happy','laugh','teasing','smug','angry','annoyed','sad','sleepy','shocked','curious','thinking','excited','embarrassed','focused','mischief'])
  const expression = allowedExpressions.has(payload?.expression) ? payload.expression : 'happy'
  const mood = String(payload?.mood || 'happy').slice(0, 32)
  return { text, expression, mood }
}

function createFriendAgent(config) {
  const endpoint = normalizeHttpsUrl(config?.friendApiUrl)

  async function chat(input) {
    if (!endpoint) return { ok: false, reason: 'not-configured' }

    const message = String(input?.message || '').trim().slice(0, MAX_MESSAGE_CHARS)
    if (!message) return { ok: false, reason: 'empty-message' }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message,
          language: sanitizeLanguage(input?.language),
          voiceStyle: String(input?.voiceStyle || 'cute').slice(0, 24),
          history: sanitizeHistory(input?.history),
          product: 'screen-gremlin',
          clientVersion: String(input?.clientVersion || '').slice(0, 32),
        }),
        signal: controller.signal,
      })
      if (!response.ok) return { ok: false, reason: `http-${response.status}` }
      const payload = await response.json()
      const reply = parseReply(payload)
      if (!reply) return { ok: false, reason: 'invalid-reply' }
      return { ok: true, reply }
    } catch {
      return { ok: false, reason: 'unavailable' }
    } finally {
      clearTimeout(timeout)
    }
  }

  return { chat, configured: Boolean(endpoint) }
}

module.exports = { createFriendAgent }
