const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const os = require('os');
const exec = require('child_process').execFile;
const axios = require('axios');
const path = require('path');
const isPackaged = require('electron-is-packaged').isPackaged;
const rootPath = os.platform() == 'win32' || !isPackaged ? require('electron-root-path').rootPath : path.join(require('electron-root-path').rootPath, '..');

function createWindow () {
    const win = new BrowserWindow({
        width: 1280,
        minWidth: 1280,
        height: 1024,
        minHeight: 1024,
        webPreferences: {
            nodeIntegration: true,
            preload: path.join(__dirname, 'preload.js'),
        }
    });

    if (fs.existsSync(path.join(rootPath, 'temp')) === false) {
        fs.mkdirSync(path.join(rootPath, 'temp'));
    }

    // win.webContents.openDevTools();
    win.setMenuBarVisibility(false);
    win.loadFile('index.html');
}

function promiseFromChildProcess(child) {
    return new Promise((resolve, reject) => {
        child.addListener('error', reject);
        child.addListener('exit', resolve);
    });
}

function getVoice(text) {
    const url = "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=zh-TW&q=";
    return axios.get(
        url + encodeURIComponent(text),
        { responseType: 'arraybuffer' }
    );
}

function saveFile(name, buffer) {
    return fs.promises.writeFile(name, buffer);
}

function readFile(name) {
    return fs.promises.readFile(name);
}

function changeSpeed(speed, source, target) {
    let ffmpeg = path.join(rootPath, 'resources', 'ffmpeg');

    if (os.platform() == 'darwin' && isPackaged) {
        ffmpeg = path.join(require('electron-root-path').rootPath, 'Contents', 'resources', 'ffmpeg');
    }

    const child = exec(ffmpeg, [
        '-y',
        '-i',
        source,
        '-filter:a',
        `atempo=${speed}`,
        target
    ]);

    return promiseFromChildProcess(child);
}

async function tryout(speed, text) {
    const buffer = await getVoice(text);
    const name =  `${text.replace(/(?:\r\n|\r|\n| )/g, '')}.mp3`;
    
    if (speed == 1) {
        return buffer.data;
    }

    const source = path.join(rootPath, 'temp', name);
    const target = path.join(rootPath, 'temp', `${speed}x_${name}`);
    
    await saveFile(source, buffer.data);
    await changeSpeed(speed, source, target);
    
    return await readFile(target);
}

async function download(savePath, speed, text) {
    const buffer = await getVoice(text);
    const name =  `${text.replace(/(?:\r\n|\r|\n| )/g, '')}.mp3`;
    let source;
    let target;

    if (speed == 1) {
        source = path.join(savePath, name);
        await saveFile(source, buffer.data);
        return;
    }

    source = path.join(rootPath, 'temp', name);
    target = path.join(savePath, `${speed}x_${name}`);

    await saveFile(source, buffer.data);
    await changeSpeed(speed, source, target);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.handle('rootPath', () => {
    return rootPath;
});

ipcMain.handle('folder-selector', () => {
    return dialog.showOpenDialogSync({
        title: '選擇存放資料夾',
        properties: ['openDirectory']
    });
});

ipcMain.handle('tryout', async (event, speed, text) => {
    try {
        return await tryout(speed, text);
    } catch (e) {
        return null;
    }
});

ipcMain.handle('download', async (event, savePath, speed, text) => {
    try {
        await download(savePath, speed, text);
        return true;
    } catch (e) {
        return null;
    }
});