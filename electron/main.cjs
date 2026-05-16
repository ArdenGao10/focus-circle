// Electron main process — desktop shell for Focus Circle (PRD 二期).
//
// Opens two windows:
//   1. main  — the full web app.
//   2. ball  — a transparent, frameless, always-on-top floating orb that
//              loads the /ball route.
//
// The ball window is created hidden. The web app's <ElectronBallBridge/>
// reports timer state over IPC ('ball:set-active'); this process shows the
// ball while a session runs and hides it when the session ends. The ball
// is loaded fresh on each activation so it picks up the auth cookies the
// user established in the main window (both windows share one session).

const { app, BrowserWindow, ipcMain, screen } = require('electron')
const path = require('path')

const APP_URL = process.env.APP_URL || 'http://localhost:3000'
const BALL_SIZE = 180

let mainWindow = null
let ballWindow = null
let ballActive = false

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 430,
    height: 880,
    title: '专注圈',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })
  mainWindow.loadURL(APP_URL)
}

function createBallWindow() {
  const { workArea } = screen.getPrimaryDisplay()
  ballWindow = new BrowserWindow({
    width: BALL_SIZE,
    height: BALL_SIZE,
    x: workArea.x + workArea.width - BALL_SIZE - 24,
    y: workArea.y + 24,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })
  // Float above other apps, including full-screen ones.
  ballWindow.setAlwaysOnTop(true, 'screen-saver')
  ballWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
}

app.whenReady().then(() => {
  createMainWindow()
  createBallWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

// Timer state from the web app drives the ball's visibility.
ipcMain.on('ball:set-active', (_event, active) => {
  if (!ballWindow || ballWindow.isDestroyed()) return
  active = Boolean(active)
  if (active === ballActive) return
  ballActive = active
  if (active) {
    ballWindow.loadURL(`${APP_URL}/ball`)
    ballWindow.showInactive()
  } else {
    ballWindow.hide()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
