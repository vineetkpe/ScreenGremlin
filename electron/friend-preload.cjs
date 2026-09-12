const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('screenGremlinFriend', {
  close() {
    return ipcRenderer.invoke('screen-gremlin-v2:close-friend')
  },
  chat(input) {
    return ipcRenderer.invoke('screen-gremlin-v2:friend-chat', input)
  },
  getAgentStatus() {
    return ipcRenderer.invoke('screen-gremlin-v2:friend-agent-status')
  },
  triggerAction(action, language) {
    return ipcRenderer.invoke('screen-gremlin-v2:friend-action', { action, language })
  },
})