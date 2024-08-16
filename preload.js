const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  triggerUpdateCheck: () => ipcRenderer.invoke('trigger-update-check')
})
