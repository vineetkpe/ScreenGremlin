const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { pathToFileURL } = require('node:url')
const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  globalShortcut,
  ipcMain,
  nativeImage,
  net,
  protocol,
  screen,
  session,
  shell,
} = require('electron')
const product = require('./product-config.cjs')

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'screengremlin',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: false,
      corsEnabled: false,
    },
  },
])

const DEFAULT_SETTINGS = {
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

const THEMES = new Set(['lime', 'pink', 'ice', 'purple'])
const INTENSITIES = new Set(['chill', 'normal', 'chaos'])
const PERSONALITIES = new Set(['cute', 'savage', 'lazy', 'chaotic', 'gamer', 'office'])
const ACCESSORIES = new Set(['none', 'cap', 'glasses', 'headphones', 'crown'])
const FREE_PERSONALITIES = new Set(['cute', 'office'])
const FREE_ACCESSORIES = new Set(['none', 'cap'])
const MAX_LICENSE_KEY_LENGTH = 8192
const MAX_LICENSE_PAYLOAD_BYTES = 4096
const MAX_EXTERNAL_URL_LENGTH = 2048
const MAX_GREMLIN_NAME_LENGTH = 24
const MAX_FOCUS_MS = 24 * 60 * 60 * 1000
const APP_ORIGIN = 'screengremlin://app'
const SMOKE_TEST_ENABLED = !app.isPackaged && process.env.SCREEN_GREMLIN_SMOKE_TEST === '1'

const LICENSE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA+0DdrXsoSFENxemSmGEwMR97JWst6JZMPjLXk466JiE=
-----END PUBLIC KEY-----`

let appState = {
  settings: { ...DEFAULT_SETTINGS },
  licenseKey: '',
  license: null,
}

let settingsWindow = null
let tray = null
let isQuitting = false
let smokeTestSettled = false
const overlayWindows = new Map()

function stateFilePath() {
  return path.join(app.getPath('userData'), 'state.json')
}

function normalizeHttpsUrl(rawUrl) {
  try {
    const raw = String(rawUrl || '').trim()
    if (!raw || raw.length > MAX_EXTERNAL_URL_LENGTH) return null
    const url = new URL(raw)
    if (url.protocol !== 'https:' || url.username || url.password) return null
    return url.toString()
  } catch {
    return null
  }
}

function allowedExternalUrls() {
  return new Set(
    [product.checkoutUrl, product.downloadUrl, product.creatorUnlockUrl]
      .map(normalizeHttpsUrl)
      .filter(Boolean),
  )
}

function verifyLicenseKey(rawKey) {
  const key = String(rawKey || '').trim()
  if (!key) return { valid: false, error: 'Enter a license key.' }
  if (key.length > MAX_LICENSE_KEY_LENGTH) {
    return { valid: false, error: 'License key is too long.' }
  }

  try {
    const parts = key.split('.')
    if (parts.length !== 3) {
      return { valid: false, error: 'This is not a ScreenGremlin license.' }
    }

    const [prefix, payloadPart, signaturePart] = parts
    if (prefix !== 'SG1' || !payloadPart || !signaturePart) {
      return { valid: false, error: 'This is not a ScreenGremlin license.' }
    }

    const payloadBytes = Buffer.from(payloadPart, 'base64url')
    const signature = Buffer.from(signaturePart, 'base64url')
    if (payloadBytes.length === 0 || payloadBytes.length > MAX_LICENSE_PAYLOAD_BYTES || signature.length !== 64) {
      return { valid: false, error: 'License format is invalid.' }
    }

    const verified = crypto.verify(null, payloadBytes, LICENSE_PUBLIC_KEY, signature)
    if (!verified) return { valid: false, error: 'License signature is invalid.' }

    const payload = JSON.parse(payloadBytes.toString('utf8'))
    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'License payload is invalid.' }
    }
    if (payload.product !== 'screen-gremlin' || payload.tier !== 'pro') {
      return { valid: false, error: 'License is for a different product or tier.' }
    }

    const id = String(payload.id || '')
    const owner = String(payload.owner || 'ScreenGremlin Pro')
    if (!id || id.length > 128 || owner.length > 160) {
      return { valid: false, error: 'License identity is invalid.' }
    }

    if (payload.issuedAt && Number.isNaN(Date.parse(payload.issuedAt))) {
      return { valid: false, error: 'License issue date is invalid.' }
    }
    if (payload.expiresAt) {
      const expiresAt = Date.parse(payload.expiresAt)
      if (Number.isNaN(expiresAt)) return { valid: false, error: 'License expiry date is invalid.' }
      if (expiresAt < Date.now()) return { valid: false, error: 'This license has expired.' }
    }

    return {
      valid: true,
      license: {
        id,
        owner,
        tier: 'pro',
        issuedAt: payload.issuedAt || null,
        expiresAt: payload.expiresAt || null,
      },
    }
  } catch {
    return { valid: false, error: 'License could not be read.' }
  }
}

function isPro() {
  if (!app.isPackaged && process.env.SCREEN_GREMLIN_DEV_PRO === '1') return true
  return Boolean(appState.license)
}

function publicState() {
  return {
    settings: { ...appState.settings },
    pro: isPro(),
    license: appState.license,
    appVersion: app.getVersion(),
    platform: process.platform,
    checkoutUrl: product.checkoutUrl || '',
    priceUsd: product.priceUsd,
    downloadUrl: product.downloadUrl,
    creatorUnlockUrl: product.creatorUnlockUrl || '',
  }
}

function cleanName(value) {
  const cleaned = String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, MAX_GREMLIN_NAME_LENGTH)
  return cleaned || DEFAULT_SETTINGS.name
}

function sanitizeSettingsPatch(patch) {
  const next = {}
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return next

  if (typeof patch.paused === 'boolean') next.paused = patch.paused
  if (typeof patch.speech === 'boolean') next.speech = patch.speech
  if (typeof patch.notices === 'boolean') next.notices = patch.notices
  if (typeof patch.startAtLogin === 'boolean') next.startAtLogin = patch.startAtLogin
  if (typeof patch.allDisplays === 'boolean') next.allDisplays = patch.allDisplays
  if (typeof patch.alwaysOnTop === 'boolean') next.alwaysOnTop = patch.alwaysOnTop
  if (typeof patch.sounds === 'boolean') next.sounds = patch.sounds
  if (typeof patch.rareAnimations === 'boolean') next.rareAnimations = patch.rareAnimations
  if (typeof patch.fullscreenSafe === 'boolean') next.fullscreenSafe = patch.fullscreenSafe
  if (typeof patch.duo === 'boolean') next.duo = isPro() ? patch.duo : false
  if (typeof patch.name === 'string') next.name = cleanName(patch.name)

  if (patch.focusUntil === null) {
    next.focusUntil = null
  } else if (typeof patch.focusUntil === 'number' && Number.isFinite(patch.focusUntil)) {
    const now = Date.now()
    next.focusUntil = patch.focusUntil <= now ? null : Math.min(patch.focusUntil, now + MAX_FOCUS_MS)
  }

  if (typeof patch.intensity === 'string' && INTENSITIES.has(patch.intensity)) {
    next.intensity = patch.intensity === 'chaos' && !isPro() ? 'normal' : patch.intensity
  }

  if (typeof patch.theme === 'string' && THEMES.has(patch.theme)) {
    next.theme = patch.theme !== 'lime' && !isPro() ? 'lime' : patch.theme
  }

  if (typeof patch.personality === 'string' && PERSONALITIES.has(patch.personality)) {
    next.personality = !isPro() && !FREE_PERSONALITIES.has(patch.personality) ? 'cute' : patch.personality
  }

  if (typeof patch.accessory === 'string' && ACCESSORIES.has(patch.accessory)) {
    next.accessory = !isPro() && !FREE_ACCESSORIES.has(patch.accessory) ? 'none' : patch.accessory
  }

  return next
}

function loadState() {
  try {
    const raw = fs.readFileSync(stateFilePath(), 'utf8')
    const parsed = JSON.parse(raw)
    appState.settings = {
      ...DEFAULT_SETTINGS,
      ...(parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {}),
    }
    appState.settings = { ...DEFAULT_SETTINGS, ...sanitizeSettingsPatch(appState.settings) }
    appState.licenseKey = typeof parsed.licenseKey === 'string' ? parsed.licenseKey.slice(0, MAX_LICENSE_KEY_LENGTH) : ''
    const licenseResult = verifyLicenseKey(appState.licenseKey)
    appState.license = licenseResult.valid ? licenseResult.license : null
    appState.settings = { ...DEFAULT_SETTINGS, ...sanitizeSettingsPatch(appState.settings) }
  } catch {
    appState = {
      settings: { ...DEFAULT_SETTINGS },
      licenseKey: '',
      license: null,
    }
  }
}

function saveState() {
  try {
    const directory = path.dirname(stateFilePath())
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 })
    fs.writeFileSync(
      stateFilePath(),
      JSON.stringify({ settings: appState.settings, licenseKey: appState.licenseKey }, null, 2),
      { encoding: 'utf8', mode: 0o600 },
    )
  } catch (error) {
    console.error('Failed to persist ScreenGremlin settings:', error)
  }
}

function broadcastState() {
  const state = publicState()
  for (const window of overlayWindows.values()) {
    if (!window.isDestroyed()) window.webContents.send('screen-gremlin:state-changed', state)
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('screen-gremlin:state-changed', state)
  }
}

function applyLoginSetting() {
  if (!app.isPackaged) return
  try {
    app.setLoginItemSettings({
      openAtLogin: Boolean(appState.settings.startAtLogin),
      openAsHidden: true,
    })
  } catch (error) {
    console.warn('Could not change start-at-login setting:', error)
  }
}

function applyWindowSettings() {
  for (const window of overlayWindows.values()) {
    if (window.isDestroyed()) continue
    window.setAlwaysOnTop(Boolean(appState.settings.alwaysOnTop), 'screen-saver')
    try {
      window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: !appState.settings.fullscreenSafe })
    } catch {
      // Some platforms ignore visibleOnFullScreen; Focus mode remains available everywhere.
    }
    if (!window.isVisible()) window.showInactive()
  }
}

function registerAppProtocol() {
  const distRoot = path.resolve(__dirname, '..', 'dist')

  protocol.handle('screengremlin', (request) => {
    try {
      const url = new URL(request.url)
      if (url.host !== 'app') return new Response('Not found', { status: 404 })
      const requestedPath = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)
      const filePath = path.resolve(distRoot, `.${requestedPath}`)
      const relativePath = path.relative(distRoot, filePath)
      const unsafePath = relativePath.startsWith('..') || path.isAbsolute(relativePath)
      if (unsafePath) return new Response('Bad request', { status: 400 })
      return net.fetch(pathToFileURL(filePath).toString())
    } catch {
      return new Response('Bad request', { status: 400 })
    }
  })
}

function configureSessionSecurity() {
  const ses = session.defaultSession
  ses.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
  ses.setPermissionCheckHandler(() => false)
  ses.webRequest.onBeforeRequest(
    { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] },
    (_details, callback) => callback({ cancel: true }),
  )
}

function hardenWebContents(contents) {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))
  contents.on('will-attach-webview', (event) => event.preventDefault())
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`${APP_ORIGIN}/`)) event.preventDefault()
  })
}

function attachSmokeTest(contents) {
  if (!SMOKE_TEST_ENABLED) return

  contents.once('did-finish-load', () => {
    if (smokeTestSettled) return
    const loadedUrl = contents.getURL()
    if (!loadedUrl.startsWith(`${APP_ORIGIN}/`)) {
      smokeTestSettled = true
      console.error(`Smoke test loaded an unexpected URL: ${loadedUrl}`)
      app.exit(1)
      return
    }
    smokeTestSettled = true
    setTimeout(() => app.exit(0), 100)
  })

  contents.once('did-fail-load', (_event, errorCode, errorDescription, validatedUrl, isMainFrame) => {
    if (!isMainFrame || smokeTestSettled) return
    smokeTestSettled = true
    console.error(`Smoke test failed to load ${validatedUrl}: ${errorCode} ${errorDescription}`)
    app.exit(1)
  })
}

function renderApp(window, mode) {
  return window.loadURL(`${APP_ORIGIN}/index.html?mode=${encodeURIComponent(mode)}`)
}

function createOverlayForDisplay(display) {
  const { bounds } = display
  const window = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false,
    alwaysOnTop: Boolean(appState.settings.alwaysOnTop),
    show: false,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: !app.isPackaged,
      backgroundThrottling: true,
    },
  })

  window.setAlwaysOnTop(Boolean(appState.settings.alwaysOnTop), 'screen-saver')
  try {
    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: !appState.settings.fullscreenSafe })
  } catch {
    // Platform does not expose native fullscreen-space visibility controls.
  }

  if (process.platform === 'linux') {
    window.setIgnoreMouseEvents(true)
  } else {
    window.setIgnoreMouseEvents(true, { forward: true })
  }

  renderApp(window, 'overlay')
  window.once('ready-to-show', () => window.showInactive())
  window.on('closed', () => overlayWindows.delete(String(display.id)))
  overlayWindows.set(String(display.id), window)
  return window
}

function syncOverlays() {
  const displays = appState.settings.allDisplays ? screen.getAllDisplays() : [screen.getPrimaryDisplay()]
  const wanted = new Map(displays.map((display) => [String(display.id), display]))

  for (const [displayId, window] of overlayWindows.entries()) {
    if (!wanted.has(displayId)) {
      overlayWindows.delete(displayId)
      if (!window.isDestroyed()) window.destroy()
    }
  }

  for (const [displayId, display] of wanted.entries()) {
    let window = overlayWindows.get(displayId)
    if (!window || window.isDestroyed()) window = createOverlayForDisplay(display)
    window.setBounds(display.bounds, false)
  }
  applyWindowSettings()
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show()
    settingsWindow.focus()
    return settingsWindow
  }

  settingsWindow = new BrowserWindow({
    width: 600,
    height: 820,
    minWidth: 500,
    minHeight: 650,
    title: 'ScreenGremlin Settings',
    backgroundColor: '#111113',
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: !app.isPackaged,
    },
  })

  renderApp(settingsWindow, 'settings')
  settingsWindow.once('ready-to-show', () => {
    settingsWindow?.show()
    settingsWindow?.focus()
  })
  settingsWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      settingsWindow.hide()
    }
  })
  settingsWindow.on('closed', () => { settingsWindow = null })
  return settingsWindow
}

function togglePause() {
  if (typeof appState.settings.focusUntil === 'number' && appState.settings.focusUntil > Date.now()) {
    return updateSettings({ focusUntil: null, paused: false })
  }
  return updateSettings({ paused: !appState.settings.paused })
}

function buildTrayMenu() {
  if (!tray) return
  const menu = Menu.buildFromTemplate([
    { label: appState.settings.paused ? 'Resume Gremlin' : 'Pause Gremlin', click: () => togglePause() },
    { label: 'Settings…', click: () => createSettingsWindow() },
    { type: 'separator' },
    { label: 'Start at login', type: 'checkbox', checked: Boolean(appState.settings.startAtLogin), click: (item) => updateSettings({ startAtLogin: item.checked }) },
    { label: 'Show on all displays', type: 'checkbox', checked: Boolean(appState.settings.allDisplays), click: (item) => updateSettings({ allDisplays: item.checked }) },
    { type: 'separator' },
    { label: 'Quit ScreenGremlin', click: () => { isQuitting = true; app.quit() } },
  ])
  tray.setContextMenu(menu)
  tray.setToolTip(appState.settings.paused ? 'ScreenGremlin — paused' : 'ScreenGremlin')
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'build', 'icon.png')
  let icon = nativeImage.createFromPath(iconPath)
  if (process.platform === 'darwin') {
    icon = icon.resize({ width: 18, height: 18 })
    icon.setTemplateImage(true)
  } else {
    icon = icon.resize({ width: 22, height: 22 })
  }
  tray = new Tray(icon)
  tray.on('click', () => createSettingsWindow())
  buildTrayMenu()
}

function updateSettings(patch) {
  const sanitized = sanitizeSettingsPatch(patch)
  appState.settings = { ...appState.settings, ...sanitized }
  if ('startAtLogin' in sanitized) applyLoginSetting()
  if ('allDisplays' in sanitized) syncOverlays()
  saveState()
  applyWindowSettings()
  buildTrayMenu()
  broadcastState()
  return publicState()
}

function senderIsKnown(event) {
  const window = BrowserWindow.fromWebContents(event.sender)
  if (!window) return false
  if (window === settingsWindow) return true
  return Array.from(overlayWindows.values()).includes(window)
}

function registerIpc() {
  ipcMain.on('screen-gremlin:set-interactive', (event, interactive) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window || !Array.from(overlayWindows.values()).includes(window)) return
    if (process.platform === 'linux') return
    window.setIgnoreMouseEvents(!Boolean(interactive), { forward: true })
  })

  ipcMain.handle('screen-gremlin:get-state', (event) => senderIsKnown(event) ? publicState() : null)
  ipcMain.handle('screen-gremlin:update-settings', (event, patch) => senderIsKnown(event) ? updateSettings(patch) : null)

  ipcMain.handle('screen-gremlin:activate-license', (event, key) => {
    if (!senderIsKnown(event)) return { valid: false, error: 'Unknown window.' }
    const result = verifyLicenseKey(key)
    if (!result.valid) return result
    appState.licenseKey = String(key).trim()
    appState.license = result.license
    appState.settings = { ...DEFAULT_SETTINGS, ...sanitizeSettingsPatch(appState.settings) }
    saveState()
    broadcastState()
    return { valid: true, state: publicState() }
  })

  ipcMain.handle('screen-gremlin:deactivate-license', (event) => {
    if (!senderIsKnown(event)) return null
    appState.licenseKey = ''
    appState.license = null
    if (appState.settings.intensity === 'chaos') appState.settings.intensity = 'normal'
    if (appState.settings.theme !== 'lime') appState.settings.theme = 'lime'
    if (!FREE_PERSONALITIES.has(appState.settings.personality)) appState.settings.personality = 'cute'
    if (!FREE_ACCESSORIES.has(appState.settings.accessory)) appState.settings.accessory = 'none'
    appState.settings.duo = false
    saveState()
    broadcastState()
    return publicState()
  })

  ipcMain.handle('screen-gremlin:open-external', async (event, rawUrl) => {
    if (!senderIsKnown(event)) return false
    const normalized = normalizeHttpsUrl(rawUrl)
    if (!normalized || !allowedExternalUrls().has(normalized)) return false
    try {
      await shell.openExternal(normalized)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('screen-gremlin:open-settings', (event) => {
    if (!senderIsKnown(event)) return false
    createSettingsWindow()
    return true
  })

  ipcMain.handle('screen-gremlin:close-settings', (event) => {
    if (!senderIsKnown(event)) return false
    settingsWindow?.hide()
    return true
  })

  ipcMain.handle('screen-gremlin:quit', (event) => {
    if (!senderIsKnown(event)) return false
    isQuitting = true
    setImmediate(() => app.quit())
    return true
  })
}

app.on('web-contents-created', (_event, contents) => {
  hardenWebContents(contents)
  attachSmokeTest(contents)
})

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => createSettingsWindow())
  app.whenReady().then(() => {
    if (SMOKE_TEST_ENABLED) {
      setTimeout(() => {
        if (!smokeTestSettled) {
          smokeTestSettled = true
          console.error('Smoke test timed out before the renderer loaded.')
          app.exit(1)
        }
      }, 10000).unref()
    }

    registerAppProtocol()
    configureSessionSecurity()
    loadState()
    applyLoginSetting()
    registerIpc()
    syncOverlays()
    if (!SMOKE_TEST_ENABLED) createTray()
    globalShortcut.register('CommandOrControl+Shift+G', () => togglePause())
    screen.on('display-added', syncOverlays)
    screen.on('display-removed', syncOverlays)
    screen.on('display-metrics-changed', syncOverlays)
    app.on('activate', () => {
      if (overlayWindows.size === 0) syncOverlays()
      createSettingsWindow()
    })
  })
}

app.on('before-quit', () => { isQuitting = true })
app.on('will-quit', () => globalShortcut.unregisterAll())
app.on('window-all-closed', () => {
  // Tray app: remain running until Quit is selected.
})
