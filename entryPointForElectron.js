import { app, BrowserWindow, screen } from 'electron'
const createWindow = () => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const mainWindow = new BrowserWindow({
    width: width - 200,
    height: height - 100,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })
  mainWindow.loadFile('./src/main.html')
  mainWindow.webContents.openDevTools()
}
app.whenReady().then(createWindow)
app.on('window-all-closed', app.quit)