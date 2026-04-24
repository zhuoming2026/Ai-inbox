"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // 文件操作
  listInbox: () => electron.ipcRenderer.invoke("inbox:list"),
  readFile: (slug) => electron.ipcRenderer.invoke("inbox:read", slug),
  readRawFile: (slug) => electron.ipcRenderer.invoke("inbox:read-raw", slug),
  writeFile: (slug, data) => electron.ipcRenderer.invoke("inbox:write", slug, data),
  updateFile: (slug, data) => electron.ipcRenderer.invoke("inbox:write", slug, data),
  writeRawFile: (slug, raw) => electron.ipcRenderer.invoke("inbox:write-raw", slug, raw),
  archiveFile: (slug) => electron.ipcRenderer.invoke("inbox:archive", slug),
  deleteFile: (slug) => electron.ipcRenderer.invoke("inbox:delete", slug),
  setBucket: (slug, bucket) => electron.ipcRenderer.invoke("inbox:set-bucket", slug, bucket),
  // 设置
  getSettings: () => electron.ipcRenderer.invoke("settings:get"),
  saveSettings: (settings) => electron.ipcRenderer.invoke("settings:save", settings),
  testAiConnection: (settings) => electron.ipcRenderer.invoke("ai:test", settings),
  readScratchpad: () => electron.ipcRenderer.invoke("scratchpad:read"),
  writeScratchpad: (content) => electron.ipcRenderer.invoke("scratchpad:write", content),
  // MCP 输入（处理用户输入）
  processInput: (type, content) => electron.ipcRenderer.invoke("mcp:process-input", { type, content }),
  enrichFile: (slug) => electron.ipcRenderer.invoke("ai:enrich", slug),
  getMcpStatus: () => electron.ipcRenderer.invoke("mcp:status"),
  startMcp: () => electron.ipcRenderer.invoke("mcp:start"),
  stopMcp: () => electron.ipcRenderer.invoke("mcp:stop"),
  // 截图
  captureScreenshot: () => electron.ipcRenderer.invoke("screenshot:capture"),
  // 事件监听
  onInboxUpdate: (callback) => {
    const listener = () => callback();
    electron.ipcRenderer.on("inbox:updated", listener);
    return () => electron.ipcRenderer.removeListener("inbox:updated", listener);
  },
  // 文件夹选择
  selectFolder: () => electron.ipcRenderer.invoke("inbox:select-folder")
});
