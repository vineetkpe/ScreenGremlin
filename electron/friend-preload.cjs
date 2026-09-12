const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('screenGremlinFriend', {
  close() {
    return ipcRenderer.invoke('screen-gremlin-v2:close-friend')
  },
})
