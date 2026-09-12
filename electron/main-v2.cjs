const path = require('node:path')
const { app, BrowserWindow, ipcMain, screen } = require('electron')
const product = require('./product-config.cjs')
const { createFriendAgent } = require('./friend-agent.cjs')

// Keep the hardened v1 main process intact and layer the v2 friend window on top.
require('./main.cjs')

const APP_ORIGIN = 'screengremlin://app'
const FRIEND_WIDTH = 410
const FRIEND_HEIGHT = 560
const FRIEND_ACTIONS = new Set(['play', 'pat', 'bonk', 'quiet'])
const friendAgent = createFriendAgent(product)
let friendWindow = null

function isTrustedRenderer(event) {
  const senderWindow = BrowserWindow.fromWebContents(event.sender)
  if (!senderWindow || senderWindow.isDestroyed()) return false
  const url = event.sender.getURL()
  return url.startsWith(`${APP_ORIGIN}/`)
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function friendBoundsNearPoint(point) {
  const display = screen.getDisplayNearestPoint(point)
  const area = display.workArea
  const x = clamp(Math.round(point.x + 18), area.x + 8, area.x + Math.max(8, area.width - FRIEND_WIDTH - 8))
  const y = clamp(Math.round(point.y - 110), area.y + 8, area.y + Math.max(8, area.height - FRIEND_HEIGHT - 8))
  return { x, y, width: FRIEND_WIDTH, height: FRIEND_HEIGHT }
}

function broadcastFriendAction(action, language) {
  const safeAction = FRIEND_ACTIONS.has(action) ? action : null
  if (!safeAction) return false
  const safeLanguage = ['en', 'hi', 'hinglish'].includes(language) ? language : 'hinglish'
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) continue
    const url = window.webContents.getURL()
    if (url.startsWith(`${APP_ORIGIN}/`) && url.includes('mode=overlay')) {
      window.webContents.send('screen-gremlin-v2:friend-action', { action: safeAction, language: safeLanguage })
    }
  }
  return true
}

function createOrShowFriendWindow(point) {
  const bounds = friendBoundsNearPoint(point)

  if (friendWindow && !friendWindow.isDestroyed()) {
    friendWindow.setBounds(bounds, false)
    friendWindow.show()
    friendWindow.focus()
    return friendWindow
  }

  friendWindow = new BrowserWindow({
    ...bounds,
    frame: false,
    transparent: false,
    backgroundColor: '#121215',
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: true,
    alwaysOnTop: true,
    show: false,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'friend-preload.cjs'),
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

  friendWindow.setAlwaysOnTop(true, 'floating')
  friendWindow.loadURL(`${APP_ORIGIN}/index.html?mode=friend`)
  friendWindow.once('ready-to-show', () => {
    friendWindow?.show()
    friendWindow?.focus()
  })
  friendWindow.on('closed', () => { friendWindow = null })

  friendWindow.on('blur', () => {
    setTimeout(() => {
      if (friendWindow && !friendWindow.isDestroyed() && !friendWindow.isFocused()) friendWindow.hide()
    }, 120)
  })

  return friendWindow
}

ipcMain.handle('screen-gremlin-v2:open-friend', (event, anchor) => {
  if (!isTrustedRenderer(event)) return false
  const senderWindow = BrowserWindow.fromWebContents(event.sender)
  if (!senderWindow) return false
  const senderBounds = senderWindow.getBounds()
  const clientX = Number(anchor?.x)
  const clientY = Number(anchor?.y)
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return false
  createOrShowFriendWindow({
    x: senderBounds.x + clamp(clientX, 0, senderBounds.width),
    y: senderBounds.y + clamp(clientY, 0, senderBounds.height),
  })
  return true
})

ipcMain.handle('screen-gremlin-v2:close-friend', (event) => {
  if (!friendWindow || friendWindow.isDestroyed()) return false
  if (BrowserWindow.fromWebContents(event.sender) !== friendWindow) return false
  friendWindow.hide()
  return true
})

ipcMain.handle('screen-gremlin-v2:friend-chat', async (event, input) => {
  if (!friendWindow || friendWindow.isDestroyed()) return { ok: false, reason: 'friend-window-missing' }
  if (BrowserWindow.fromWebContents(event.sender) !== friendWindow) return { ok: false, reason: 'unknown-window' }
  return friendAgent.chat({
    ...input,
    clientVersion: app.getVersion(),
  })
})

ipcMain.handle('screen-gremlin-v2:friend-agent-status', (event) => {
  if (!friendWindow || friendWindow.isDestroyed()) return { configured: false }
  if (BrowserWindow.fromWebContents(event.sender) !== friendWindow) return { configured: false }
  return { configured: friendAgent.configured }
})

ipcMain.handle('screen-gremlin-v2:friend-action', (event, input) => {
  if (!friendWindow || friendWindow.isDestroyed()) return false
  if (BrowserWindow.fromWebContents(event.sender) !== friendWindow) return false
  return broadcastFriendAction(String(input?.action || ''), String(input?.language || 'hinglish'))
})

app.on('before-quit', () => {
  if (friendWindow && !friendWindow.isDestroyed()) friendWindow.destroy()
  friendWindow = null
})