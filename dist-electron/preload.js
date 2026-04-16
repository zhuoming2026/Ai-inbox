"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // 文件操作
  listInbox: () => electron.ipcRenderer.invoke("inbox:list"),
  readFile: (slug) => electron.ipcRenderer.invoke("inbox:read", slug),
  writeFile: (slug, data) => electron.ipcRenderer.invoke("inbox:write", slug, data),
  updateFile: (slug, data) => electron.ipcRenderer.invoke("inbox:write", slug, data),
  archiveFile: (slug) => electron.ipcRenderer.invoke("inbox:archive", slug),
  deleteFile: (slug) => electron.ipcRenderer.invoke("inbox:delete", slug),
  // 设置
  getSettings: () => electron.ipcRenderer.invoke("settings:get"),
  saveSettings: (settings) => electron.ipcRenderer.invoke("settings:save", settings),
  // MCP 输入（处理用户输入）
  processInput: (type, content) => electron.ipcRenderer.invoke("mcp:process-input", { type, content }),
  // 截图
  captureScreenshot: () => electron.ipcRenderer.invoke("screenshot:capture"),
  // 事件监听
  onInboxUpdate: (callback) => {
    electron.ipcRenderer.on("inbox:updated", callback);
    return () => electron.ipcRenderer.removeListener("inbox:updated", callback);
  },
  // 文件夹选择
  selectFolder: () => electron.ipcRenderer.invoke("inbox:select-folder")
});
