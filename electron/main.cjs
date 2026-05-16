// Electron main process — desktop shell for Focus Circle (PRD 二期).
//
// Windows:
//   1. main  — the full web app.
//   2. ball  — a transparent, frameless, always-on-top floating orb that
//              loads the /ball route.
//   3. trash — a transparent drop-zone shown only while the ball is being
//              dragged; dropping the ball on it dismisses the ball.
//
// The ball window is created hidden. The web app's <ElectronBallBridge/>
// reports timer state over IPC ('ball:set-active'); this process shows the
// ball while a session runs and hides it when the session ends. The ball
// is loaded fresh on each activation so it picks up the auth cookies the
// user established in the main window (both windows share one session).
//
// Drag-to-trash: the ball uses an OS-level drag region, so the renderer
// gets no drag events. Instead we watch the ball window's 'move' events —
// the first move reveals the trash zone; a short gap with no moves marks
// the end of the drag, at which point an overlap test decides whether to
// dismiss the ball.

const { app, BrowserWindow, ipcMain, screen } = require('electron')
const path = require('path')

const APP_URL = process.env.APP_URL || 'http://localhost:3000'
const BALL_SIZE = 180
const TRASH_SIZE = 140
const DRAG_END_MS = 220
const TRASH_HIT_DISTANCE = 78

// Self-contained trash drop-zone — a dark circle that turns red + grows
// when the ball hovers it. Loaded as a data URL so it needs no Next route
// and no auth. setHot() is invoked from the main process.
const TRASH_HTML = `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;height:100%;background:transparent;overflow:hidden;
display:flex;align-items:center;justify-content:center}
#t{width:64px;height:64px;border-radius:50%;background:rgba(38,38,42,.82);
display:flex;align-items:center;justify-content:center;
box-shadow:0 6px 20px rgba(0,0,0,.4);transition:all .18s ease}
#t.hot{width:88px;height:88px;background:rgba(214,69,69,.94)}
svg{width:24px;height:24px}#t.hot svg{width:32px;height:32px}
</style><div id="t"><svg viewBox="0 0 24 24" fill="none" stroke="#fff"
stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg></div>
<script>window.setHot=function(h){document.getElementById('t')
.classList.toggle('hot',h)}</script>`

const TRASH_URL = `data:text/html;charset=utf-8,${encodeURIComponent(TRASH_HTML)}`

let mainWindow = null
let ballWindow = null
let trashWindow = null

let ballActive = false       // a focus session is running
let ballDismissed = false    // user trashed the ball for the current session
let trashHot = false         // ball currently overlaps the trash zone
let dragEndTimer = null      // fires when the ball stops moving
let suppressMovesUntil = 0    // ignore 'move' events right after showing

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
  ballWindow.setAlwaysOnTop(true, 'screen-saver')
  ballWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  ballWindow.on('move', onBallMove)
}

function createTrashWindow() {
  const { workArea } = screen.getPrimaryDisplay()
  trashWindow = new BrowserWindow({
    width: TRASH_SIZE,
    height: TRASH_SIZE,
    x: Math.round(workArea.x + workArea.width / 2 - TRASH_SIZE / 2),
    y: workArea.y + workArea.height - TRASH_SIZE - 24,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    fullscreenable: false,
  })
  trashWindow.setAlwaysOnTop(true, 'screen-saver')
  trashWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  trashWindow.setIgnoreMouseEvents(true)
  trashWindow.loadURL(TRASH_URL)
}

function setTrashHot(hot) {
  if (hot === trashHot) return
  trashHot = hot
  if (trashWindow && !trashWindow.isDestroyed()) {
    trashWindow.webContents
      .executeJavaScript(`window.setHot && window.setHot(${hot})`)
      .catch(() => {})
  }
}

// True when the ball's centre sits within the trash zone's centre.
function ballOverTrash() {
  if (!ballWindow || !trashWindow) return false
  const b = ballWindow.getBounds()
  const t = trashWindow.getBounds()
  const dx = b.x + b.width / 2 - (t.x + t.width / 2)
  const dy = b.y + b.height / 2 - (t.y + t.height / 2)
  return Math.hypot(dx, dy) < TRASH_HIT_DISTANCE
}

function onBallMove() {
  if (Date.now() < suppressMovesUntil) return
  if (!ballWindow || ballWindow.isDestroyed()) return
  if (!trashWindow || trashWindow.isDestroyed()) return

  if (!trashWindow.isVisible()) trashWindow.showInactive()
  setTrashHot(ballOverTrash())

  clearTimeout(dragEndTimer)
  dragEndTimer = setTimeout(onBallDragEnd, DRAG_END_MS)
}

function onBallDragEnd() {
  const dismiss = trashHot
  setTrashHot(false)
  if (trashWindow && !trashWindow.isDestroyed()) trashWindow.hide()
  if (dismiss && ballWindow && !ballWindow.isDestroyed()) {
    ballDismissed = true
    ballWindow.hide()
  }
}

function showBall() {
  if (!ballWindow || ballWindow.isDestroyed()) return
  ballWindow.loadURL(`${APP_URL}/ball`)
  suppressMovesUntil = Date.now() + 800
  ballWindow.showInactive()
}

app.whenReady().then(() => {
  createMainWindow()
  createBallWindow()
  createTrashWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

// Timer state from the web app drives the ball's visibility.
ipcMain.on('ball:set-active', (_event, active) => {
  active = Boolean(active)
  if (active === ballActive) return
  ballActive = active
  if (active) {
    if (!ballDismissed) showBall()
  } else {
    ballDismissed = false // reset for the next session
    if (ballWindow && !ballWindow.isDestroyed()) ballWindow.hide()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
