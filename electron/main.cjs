const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  globalShortcut,
  ipcMain,
  nativeImage,
  screen,
  shell,
} = require('electron')
const product = require('./product-config.cjs')

const DEFAULT_SETTINGS = {
  paused: false,
  intensity: 'normal',
  speech: true,
  notices: true,
  theme: 'lime',
  startAtLogin: false,
  allDisplays: true,
  alwaysOnTop: true,
}

const THEMES = new Set(['lime', 'pink', 'ice', 'purple'])
const INTENSITIES = new Set(['chill', 'normal', 'chaos'])

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
const overlayWindows = new Map()

function stateFilePath() {
  return path.join(app.getPath('userData'), 'state.json')
}

function verifyLicenseKey(rawKey) {
  const key = String(rawKey || '').trim()
  if (!key) return { valid: false, error: 'Enter a license key.' }

  try {
    const [prefix, payloadPart, signaturePart] = key.split('.')
    if (prefix !== 'SG1' || !payloadPart || !signaturePart) {
      return { valid: false, error: 'This is not a ScreenGremlin license.' }
    }

    const payloadBytes = Buffer.from(payloadPart, 'base64url')
    const signature = Buffer.from(signaturePart, 'base64url')
    const verified = crypto.verify(null, payloadBytes, LICENSE_PUBLIC_KEY, signature)

    if (!verified) return { valid: false, error: 'License signature is invalid.' }

    const payload = JSON.parse(payloadBytes.toString('utf8'))
    if (payload.product !== 'screen-gremlin' || payload.tier !== 'pro') {
      return { valid: false, error: 'License is for a different product or tier.' }
    }

    if (payload.expiresAt && Date.parse(payload.expiresAt) < Date.now()) {
      return { valid: false, error: 'This license has expired.' }
    }

    return {
      valid: true,
      license: {
        id: String(payload.id || ''),
        owner: String(payload.owner || 'ScreenGremlin Pro'),
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

function loadState() {
  try {
    const raw = fs.readFileSync(stateFilePath(), 'utf8')
    const parsed = JSON.parse(raw)

    appState.settings = {
      ...DEFAULT_SETTINGS,
      ...(parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {}),
    }
    appState.licenseKey = typeof parsed.licenseKey === 'string' ? parsed.licenseKey : ''

    const licenseResult = verifyLicenseKey(appState.licenseKey)
    appState.license = licenseResult.valid ? licenseResult.license : null
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
    fs.mkdirSync(path.dirname(stateFilePath()), { recursive: true })
    fs.writeFileSync(
      stateFilePath(),
      JSON.stringify(
        {
          settings: appState.settings,
          licenseKey: appState.licenseKey,
        },
        null,
        2,
      ),
      'utf8',
    )
  } catch (error) {
    console.error('Failed to persist ScreenGremlin settings:', error)
  }
}

function sanitizeSettingsPatch(patch) {
  const next = {}
  if (!patch || typeof patch !== 'object') return next

  if (typeof patch.paused === 'boolean') next.paused = patch.paused
  if (typeof patch.speech === 'boolean') next.speech = patch.speech
  if (typeof patch.notices === 'boolean') next.notices = patch.notices
  if (typeof patch.startAtLogin === 'boolean') next.startAtLogin = patch.startAtLogin
  if (typeof patch.allDisplays === 'boolean') next.allDisplays = patch.allDisplays
  if (typeof patch.alwaysOnTop === 'boolean') next.alwaysOnTop = patch.alwaysOnTop

  if (typeof patch.intensity === 'string' && INTENSITIES.has(patch.intensity)) {
    next.intensity = patch.intensity === 'chaos' && !isPro() ? 'normal' : patch.intensity
  }

  if (typeof patch.theme === 'string' && THEMES.has(patch.theme)) {
    next.theme = patch.theme !== 'lime' && !isPro() ? 'lime' : patch.theme
  }

  return next
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
    if (appState.settings.paused) {
      window.hide()
    } else {
      window.showInactive()
    }
  }
}

function renderFile(window, mode) {
  return window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), {
    query: { mode },
  })
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
      backgroundThrottling: false,
    },
  })

  window.setAlwaysOnTop(Boolean(appState.settings.alwaysOnTop), 'screen-saver')
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (process.platform !== 'linux') {
    window.setIgnoreMouseEvents(true, { forward: true })
  }

  renderFile(window, 'overlay')

  window.once('ready-to-show', () => {
    if (!appState.settings.paused) window.showInactive()
  })

  window.on('closed', () => {
    overlayWindows.delete(String(display.id))
  })

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

    if (!window || window.isDestroyed()) {
      window = createOverlayForDisplay(display)
    }

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
    width: 560,
    height: 760,
    minWidth: 480,
    minHeight: 620,
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
    },
  })

  renderFile(settingsWindow, 'settings')

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

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })

  return settingsWindow
}

function buildTrayMenu() {
  if (!tray) return

  const menu = Menu.buildFromTemplate([
    {
      label: appState.settings.paused ? 'Resume Gremlin' : 'Pause Gremlin',
      click: () => updateSettings({ paused: !appState.settings.paused }),
    },
    {
      label: 'Settings…',
      click: () => createSettingsWindow(),
    },
    { type: 'separator' },
    {
      label: 'Start at login',
      type: 'checkbox',
      checked: Boolean(appState.settings.startAtLogin),
      click: (item) => updateSettings({ startAtLogin: item.checked }),
    },
    {
      label: 'Show on all displays',
      type: 'checkbox',
      checked: Boolean(appState.settings.allDisplays),
      click: (item) => updateSettings({ allDisplays: item.checked }),
    },
    { type: 'separator' },
    {
      label: 'Quit ScreenGremlin',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
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

  ipcMain.handle('screen-gremlin:get-state', (event) => {
    if (!senderIsKnown(event)) return null
    return publicState()
  })

  ipcMain.handle('screen-gremlin:update-settings', (event, patch) => {
    if (!senderIsKnown(event)) return null
    return updateSettings(patch)
  })

  ipcMain.handle('screen-gremlin:activate-license', (event, key) => {
    if (!senderIsKnown(event)) return { valid: false, error: 'Unknown window.' }

    const result = verifyLicenseKey(key)
    if (!result.valid) return result

    appState.licenseKey = String(key).trim()
    appState.license = result.license

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

    saveState()
    broadcastState()
    return publicState()
  })

  ipcMain.handle('screen-gremlin:open-external', async (event, rawUrl) => {
    if (!senderIsKnown(event)) return false

    try {
      const url = new URL(String(rawUrl || ''))
      if (url.protocol !== 'https:') return false
      await shell.openExternal(url.toString())
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('screen-gremlin:close-settings', (event) => {
    if (!senderIsKnown(event)) return false
    settingsWindow?.hide()
    return true
  })
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    createSettingsWindow()
  })

  app.whenReady().then(() => {
    loadState()
    applyLoginSetting()
    registerIpc()
    syncOverlays()
    createTray()

    globalShortcut.register('CommandOrControl+Shift+G', () => {
      updateSettings({ paused: !appState.settings.paused })
    })

    screen.on('display-added', syncOverlays)
    screen.on('display-removed', syncOverlays)
    screen.on('display-metrics-changed', syncOverlays)

    app.on('activate', () => {
      if (overlayWindows.size === 0) syncOverlays()
      createSettingsWindow()
    })
  })
}

app.on('before-quit', () => {
  isQuitting = true
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  // This is a tray app. It stays alive until the user chooses Quit.
})
