const { contextBridge, ipcRenderer } = require('electron');

// Expor APIs seguras para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Informações da aplicação
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Controle da janela
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // Eventos do menu
  onMenuNewEntry: (callback) => ipcRenderer.on('menu-new-entry', callback),
  onMenuExportReport: (callback) => ipcRenderer.on('menu-export-report', callback),
  onMenuAbout: (callback) => ipcRenderer.on('menu-about', callback),
  
  // API HTTP para comunicação com o servidor Express
  api: {
    get: (url) => fetch(`http://localhost:3000${url}`).then(res => res.json()),
    post: (url, data) => fetch(`http://localhost:3000${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    put: (url, data) => fetch(`http://localhost:3000${url}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    delete: (url) => fetch(`http://localhost:3000${url}`, {
      method: 'DELETE'
    }).then(res => res.json())
  }
});
