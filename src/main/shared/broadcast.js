const { BrowserWindow } = require("electron");

function broadcast(channel, payload) {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send(channel, payload);
  });
}

module.exports = {
  broadcast,
};
