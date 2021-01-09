const { ipcRenderer } = require('electron')

ipcRenderer.on('test', (event, arg) => {
    console.log(arg)
})