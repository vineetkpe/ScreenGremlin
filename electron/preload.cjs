const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('screenGremlin', {
  getState() {
    return ipcRenderer.invoke('screen-gremlin:get-state')
  },

  updateSettings(patch) {
    return ipcRenderer.invoke('screen-gremlin:update-settings', patch)
  },

  activateLicense(key) {
    return ipcRenderer.invoke('screen-gremlin:activate-license', key)
  },

  deactivateLicense() {
    return ipcRenderer.invoke('screen-gremlin:deactivate-license')
  },

  openExternal(url) {
    return ipcRenderer.invoke('screen-gremlin:open-external', url)
  },

  openSettings() {
    return ipcRenderer.invoke('screen-gremlin:open-settings')
  },

  closeSettings() {
    return ipcRenderer.invoke('screen-gremlin:close-settings')
  },

  openFriend(anchor) {
    return ipcRenderer.invoke('screen-gremlin-v2:open-friend', {
      x: Number(anchor?.x) || 0,
      y: Number(anchor?.y) || 0,
    })
  },

  quitApp() {
    return ipcRenderer.invoke('screen-gremlin:quit')
  },

  setInteractive(interactive) {
    ipcRenderer.send('screen-gremlin:set-interactive', Boolean(interactive))
  },

  onStateChanged(callback) {
    const listener = (_event, state) => callback(state)
    ipcRenderer.on('screen-gremlin:state-changed', listener)
    return () => ipcRenderer.removeListener('screen-gremlin:state-changed', listener)
  },
})