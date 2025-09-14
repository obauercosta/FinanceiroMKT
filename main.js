const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Importar rotas da API
const authRoutes = require('./api/routes/auth');
const clientesRoutes = require('./api/routes/clientes');
const contratosRoutes = require('./api/routes/contratos');
const receitasRoutes = require('./api/routes/receitas');
const despesasRoutes = require('./api/routes/despesas');
const folhaRoutes = require('./api/routes/folha');
const impostosRoutes = require('./api/routes/impostos');
const relatoriosRoutes = require('./api/routes/relatorios');
const dashboardRoutes = require('./api/routes/dashboard');

// Importar banco de dados
const Database = require('./api/database/database');

let mainWindow;
let server;

function createWindow() {
  // Criar janela principal
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    titleBarStyle: 'default',
    show: false
  });

  // Carregar interface
  mainWindow.loadFile('src/index.html');

  // Mostrar janela quando estiver pronta
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Abrir DevTools em modo desenvolvimento
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Configurar menu
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'Arquivo',
      submenu: [
        {
          label: 'Novo Lançamento',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-entry');
          }
        },
        {
          label: 'Exportar Relatório',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow.webContents.send('menu-export-report');
          }
        },
        { type: 'separator' },
        {
          label: 'Sair',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'Visualizar',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Sobre',
          click: () => {
            mainWindow.webContents.send('menu-about');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function startServer() {
  const expressApp = express();
  const PORT = 3000;

  // Middleware
  expressApp.use(cors());
  expressApp.use(bodyParser.json());
  expressApp.use(bodyParser.urlencoded({ extended: true }));

  // Rotas da API
  expressApp.use('/api/auth', authRoutes);
  expressApp.use('/api/clientes', clientesRoutes);
  expressApp.use('/api/contratos', contratosRoutes);
  expressApp.use('/api/receitas', receitasRoutes);
  expressApp.use('/api/despesas', despesasRoutes);
  expressApp.use('/api/folha', folhaRoutes);
  expressApp.use('/api/impostos', impostosRoutes);
  expressApp.use('/api/relatorios', relatoriosRoutes);
  expressApp.use('/api/dashboard', dashboardRoutes);

  // Rota de saúde
  expressApp.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  // Iniciar servidor
  server = expressApp.listen(PORT, 'localhost', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

// Eventos da aplicação
app.whenReady().then(async () => {
  // Inicializar banco de dados
  await Database.init();
  
  // Iniciar servidor Express
  startServer();
  
  // Criar janela principal
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (server) {
    server.close();
  }
});

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('close-window', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});
