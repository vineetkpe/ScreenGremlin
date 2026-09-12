const path = require('node:path')
const { app, BrowserWindow, ipcMain, screen } = require('electron')

let overlayWindow = null

function createOverlayWindow() {
  const { bounds } = screen.getPrimaryDisplay()

  overlayWindow = new BrowserWindow({
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
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  })

  overlayWindow.setAlwaysOnTop(true, 'screen-saver')
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  // Windows and macOS can forward pointer movement while clicks pass through.
  // Linux does not support the `forward` option, so we keep the overlay
  // interactive there until a shaped-window implementation is added.
  if (process.platform !== 'linux') {
    overlayWindow.setIgnoreMouseEvents(true, { forward: true })
  }

  overlayWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

  overlayWindow.once('ready-to-show', () => {
    overlayWindow?.showInactive()
  })

  overlayWindow.on('closed', () => {
    overlayWindow = null
  })
}

ipcMain.on('screen-gremlin:set-interactive', (event, interactive) => {
  if (!overlayWindow || event.sender !== overlayWindow.webContents) return
  if (process.platform === 'linux') return

  overlayWindow.setIgnoreMouseEvents(!Boolean(interactive), { forward: true })
})

app.whenReady().then(() => {
  createOverlayWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createOverlayWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
