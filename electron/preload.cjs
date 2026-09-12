const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('screenGremlin', {
  setInteractive(interactive) {
    ipcRenderer.send('screen-gremlin:set-interactive', Boolean(interactive))
  },
})
