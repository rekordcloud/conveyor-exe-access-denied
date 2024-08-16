// This boilerplate shows how to create a new Electron window and do online update checks.
//
// If using `app.updates = aggressive` you don't necessarily need the update check API and
// can delete all usage of it, because checks are done automatically at startup.

const { app, BrowserWindow, ipcMain } = require('electron')
const { OnlineUpdater, Version } = require('@hydraulic/conveyor-control')
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const { cwd } = require('process')

// Read the site URL from package.json
const packageJsonPath = path.join(app.getAppPath(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const updater = new OnlineUpdater(packageJson.updateSite);

async function createWindow () {
  // Create and load a window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // Set up IPC.
      preload: path.join(__dirname, 'preload.js')
    }
  })
  await mainWindow.loadFile('index.html')

  await mainWindow.webContents.openDevTools()

  // TEST CODE
  const libPath = path.join(path.parse(app.getPath('exe')).dir, 'resources/app.asar.unpacked/lib')
  let helloworldPath

  if (process.env.NODE_ENV === 'development') {
    helloworldPath = `${path.join(cwd(), 'build/lib/helloworld.exe')}`
  } else {
    helloworldPath = path.join(libPath, 'helloworld.exe')
  }

  console.log(helloworldPath)

  await mainWindow.webContents.executeJavaScript(`document.querySelector('#path').textContent = '${helloworldPath.replace(/\\/g, '/')}'`)

  exec(`"${helloworldPath}"`, async function (err, stdout, stderr) {
    console.log('stdout:', stdout)
    console.log('stderr:', stderr)

    // await mainWindow.webContents.executeJavaScript(`window.alert('${stdout.trim()}')`)
    // await mainWindow.webContents.executeJavaScript(`window.alert('${stderr.trim()}')`)

    await mainWindow.webContents.executeJavaScript(`
      document.querySelector('#output-stdout').textContent = 'stdout: ${stdout.trim()}';
      document.querySelector('#output-stderr').textContent = 'stderr: ${stderr.trim()}';
    `);
  })
}

app.whenReady().then(async () => {
  // This code is invoked once Electron is ready. Create the window.
  await createWindow();

  // Support update check RPCs.
  ipcMain.handle('trigger-update-check', async () => {
    try {
      // IMPORTANT! This will RESTART your app on Windows. If no new version is available then the app will just immediately restart,
      //            otherwise it will do an update whilst the app isn't running. Make sure the user's work is saved before calling.
      updater.triggerUpdateCheckUI();
      return 'Update check triggered successfully';
    } catch (error) {
      console.error('Error triggering update check:', error);
      return `Error: ${error.message}`;
    }
  });

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})
