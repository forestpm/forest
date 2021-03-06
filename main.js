const os = require('os')
const {app, Menu, Tray, shell} = require('electron')
const path = require('path')
const createServer = require('./lib/server')
const forage = require('./lib/forage')
const { hideBin, Parser } = require('yargs/helpers')

const assetsDirectory = path.join(__dirname, 'assets')

const log = require('electron-log');

log.catchErrors()

app.setAboutPanelOptions({
  applicationName: 'Forage',
  applicationVersion: forage.core.forageVersion(),
  copyright: 'Andrew Nesbitt',
  version: forage.core.forageVersion(),
  website: 'http://forage.pm',
  iconPath: path.join(assetsDirectory, 'forage.png')
})

var tray = undefined
var win = undefined
var db
var started = false

var argv = Parser(hideBin(process.argv), {default: {port: 8005, topic: 'forage'}})
var port = argv.port
var topic = argv.topic

if(os.platform() === 'darwin'){
  // Don't show the app in the doc
  app.dock.hide()
}

app.on('ready', () => {
  db = forage.connectDB()
  createTray()
  startServer(db)
})

async function startServer() {
  var ipfsID = await forage.connectIPFS(db, topic);
  if (ipfsID) {
    server = createServer(db)
    server.listen(port)
    // TODO decide on which packages to download via IPFS when announced (all or only versions of existing ones)
    forage.watchKnown();
    forage.periodicUpdate();
    started = true
    updateStatusMenu()
    tray.setImage(path.join(assetsDirectory, 'forageTemplate.png'))
  }
}

function stopServer() {
  log.info('stopping server')
  server.close();
  forage.core.unsubscribePackageAnnoucements(topic)
  started = false
  updateStatusMenu()
  tray.setImage(path.join(assetsDirectory, 'forageoffTemplate.png'))
}

function updateStatusMenu() {
  contextMenu.getMenuItemById('running').visible = started
  contextMenu.getMenuItemById('stop').visible = started
  contextMenu.getMenuItemById('stopped').visible = !started
  contextMenu.getMenuItemById('start').visible = !started
}

const contextMenu = Menu.buildFromTemplate([
  { id: 'running', label: 'Status: Running', type: 'normal', enabled: false, visible: false },
  { id: 'stopped', label: 'Status: Stopped', type: 'normal', enabled: false },
  { label: `Port: ${port}`, type: 'normal', enabled: false, },
  { label: `Pubsub: ${topic}`, type: 'normal', enabled: false, },
  { id: 'start', label: 'Start', type: 'normal', click: startServer },
  { id: 'stop', label: 'Stop', type: 'normal', click: stopServer },
  { label: 'Settings', submenu: [
    { id: 'config', label: 'Apply proxy config', type: 'normal', click: forage.setConfig },
    { id: 'unconfig', label: 'Remove proxy config', type: 'normal', click: forage.unsetConfig }
  ] },
  { label: 'About', type: 'normal', role: 'about' },
  { label: 'Help', type: 'normal', click: openGitHub },
  { label: 'Quit', type: 'normal', role: 'quit', accelerator: 'Command+Q' } // TODO no accelerator on windows/linux
])

const createTray = () => {
  tray = new Tray(path.join(assetsDirectory, 'forageoffTemplate.png'))

  tray.setToolTip('Forage Package Manager Proxy')
  tray.setContextMenu(contextMenu)
}

function openGitHub() {
  shell.openExternal('https://github.com/foragepm/forage')
}
