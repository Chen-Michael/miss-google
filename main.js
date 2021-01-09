const { app, BrowserWindow, ipcMain } = require('electron');
const rootPath = require('electron-root-path').rootPath;
const child = require('child_process').execFile;
const path = require('path');
const fs = require('fs');

function createWindow () {
    const win = new BrowserWindow({
        width: 1280,
        height: 1024,
        webPreferences: {
            nodeIntegration: true,
            preload: path.join(__dirname, 'preload.js'),
        }
    });

    child(path.join(rootPath, 'resources', 'ffmpeg'), [
        '-i',
        path.join(rootPath, '..', '1.mp3'),
        '-filter:a',
        'atempo=2',
        path.join(rootPath, '..', '_1.mp3')
    ], function(err, data) {
        if(err){
           console.error(err);
           return;
        }
     
        console.log(data.toString());
    });

    // fs.mkdir(path.join(__dirname, 'test'), (err) => { 
    //     if (err) { 
    //         return console.error(err); 
    //     } 
    //     console.log('Directory created successfully!'); 
    // });

    win.webContents.openDevTools();
    win.loadFile('index.html');
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

ipcMain.on('test', (event, arg) => {
    console.log(arg) // prints "帶小貓回家"
    event.reply('test', rootPath);
    event.returnValue = __dirname;
});