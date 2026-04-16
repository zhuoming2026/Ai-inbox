"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const child_process = require("child_process");
const Store = require("electron-store");
const chokidar = require("chokidar");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
let win = null;
const store = new Store({
  defaults: {
    inboxPath: "~/ai-inbox",
    archivePath: "~/lzm/llm-wiki/MyNote",
    mcpHttpPort: 3100,
    aiProvider: "minimax",
    apiKey: "",
    model: "",
    baseUrl: "",
    theme: "system"
  }
});
let mcpProcess = null;
let mcpRequestId = 0;
const mcpPendingRequests = /* @__PURE__ */ new Map();
function getMcpServerPath() {
  const appPath = electron.app.isPackaged ? path.join(process.resourcesPath, "mcp-child.js") : path.join(electron.app.getPath("home"), "ai-inbox-mcp", "dist", "index.js");
  return appPath;
}
function startMcpProcess() {
  var _a, _b;
  const mcpPath = getMcpServerPath();
  if (!fs__namespace.existsSync(mcpPath)) {
    console.error("[ai-inbox] MCP server not found at:", mcpPath);
    return;
  }
  mcpProcess = child_process.spawn("node", [mcpPath], {
    stdio: ["pipe", "pipe", "pipe"]
  });
  (_a = mcpProcess.stdout) == null ? void 0 : _a.on("data", (data) => {
    try {
      const lines = data.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        const resp = JSON.parse(line);
        if (resp.id !== void 0 && mcpPendingRequests.has(resp.id)) {
          const { resolve, reject } = mcpPendingRequests.get(resp.id);
          mcpPendingRequests.delete(resp.id);
          if (resp.error) reject(resp.error);
          else resolve(resp.result);
        }
      }
    } catch {
    }
  });
  (_b = mcpProcess.stderr) == null ? void 0 : _b.on("data", (data) => {
    console.error("[ai-inbox] MCP stderr:", data.toString());
  });
  mcpProcess.on("exit", (code) => {
    console.error("[ai-inbox] MCP process exited with code:", code);
    mcpProcess = null;
  });
}
function callMcpTool(toolName, args) {
  return new Promise((resolve, reject) => {
    if (!(mcpProcess == null ? void 0 : mcpProcess.stdin)) {
      reject(new Error("MCP process not running"));
      return;
    }
    const id = ++mcpRequestId;
    mcpPendingRequests.set(id, { resolve, reject });
    const request = { jsonrpc: "2.0", id, method: toolName, params: { arguments: args } };
    mcpProcess.stdin.write(JSON.stringify(request) + "\n");
  });
}
function getInboxPath() {
  const p = store.get("inboxPath");
  return p.startsWith("~/") ? path.join(electron.app.getPath("home"), p.slice(2)) : p;
}
function getArchivePath() {
  const p = store.get("archivePath");
  return p.startsWith("~/") ? path.join(electron.app.getPath("home"), p.slice(2)) : p;
}
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };
  const fm = {};
  match[1].split("\n").forEach((line) => {
    const [key, ...rest] = line.split(":");
    if (key && rest.length) {
      let val = rest.join(":").trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      fm[key.trim()] = val;
    }
  });
  return { frontmatter: fm, body: match[2] };
}
function createWindow() {
  win = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1e3,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  electron.globalShortcut.register("CommandOrControl+Shift+S", async () => {
    if (!win) return;
    const screenshotPath = path.join(electron.app.getPath("userData"), "screenshot.png");
    const image = await win.webContents.capturePage();
    fs__namespace.writeFileSync(screenshotPath, image.toPNG());
    console.log("[ai-inbox] Screenshot saved:", screenshotPath);
  });
}
let watcher = null;
function setupWatcher() {
  const inboxPath = getInboxPath();
  if (!fs__namespace.existsSync(inboxPath)) {
    fs__namespace.mkdirSync(inboxPath, { recursive: true });
  }
  watcher = chokidar.watch(inboxPath, { ignoreInitial: true });
  watcher.on("all", () => {
    win == null ? void 0 : win.webContents.send("inbox:updated");
  });
}
function setupIPC() {
  electron.ipcMain.handle("screenshot:capture", async () => {
    if (!win) return null;
    const screenshotPath = path.join(electron.app.getPath("userData"), "screenshot.png");
    const image = await win.webContents.capturePage();
    fs__namespace.writeFileSync(screenshotPath, image.toPNG());
    return screenshotPath;
  });
  electron.ipcMain.handle("settings:get", () => store.store);
  electron.ipcMain.handle("settings:save", (_, settings) => {
    for (const [key, value] of Object.entries(settings)) {
      store.set(key, value);
    }
  });
  electron.ipcMain.handle("inbox:list", () => {
    const inboxPath = getInboxPath();
    if (!fs__namespace.existsSync(inboxPath)) return [];
    const files = fs__namespace.readdirSync(inboxPath).filter((f) => f.endsWith(".md"));
    return files.map((filename) => {
      const filepath = path.join(inboxPath, filename);
      const stats = fs__namespace.statSync(filepath);
      const content = fs__namespace.readFileSync(filepath, "utf-8");
      const slug = filename.replace(".md", "");
      const type = slug.startsWith("todo-") ? "todo" : slug.startsWith("image-") ? "image" : slug.startsWith("link-") ? "link" : slug.startsWith("research-") ? "research" : "note";
      const { frontmatter, body } = parseFrontmatter(content);
      return {
        slug,
        type,
        filename,
        created: stats.birthtime.toISOString(),
        frontmatter,
        body: body.replace(/## Raw\n[\s\S]*$/, "").trim()
      };
    }).sort((a, b) => b.created > a.created ? 1 : -1);
  });
  electron.ipcMain.handle("inbox:read", (_, slug) => {
    const inboxPath = getInboxPath();
    const filename = slug.endsWith(".md") ? slug : `${slug}.md`;
    const filepath = path.join(inboxPath, filename);
    if (!fs__namespace.existsSync(filepath)) return null;
    return fs__namespace.readFileSync(filepath, "utf-8");
  });
  electron.ipcMain.handle("inbox:write", (_, slug, data) => {
    const inboxPath = getInboxPath();
    const filepath = path.join(inboxPath, `${slug}.md`);
    if (!fs__namespace.existsSync(filepath)) return;
    let content = fs__namespace.readFileSync(filepath, "utf-8");
    const { frontmatter: fm, body } = parseFrontmatter(content);
    if (data.frontmatter) {
      Object.assign(fm, data.frontmatter);
      const fmLines = Object.entries(fm).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
      content = `---
${fmLines.join("\n")}
---

## Content

${data.body ?? body.replace(/^## Content\n\n/, "")}`;
    }
    fs__namespace.writeFileSync(filepath, content, "utf-8");
  });
  electron.ipcMain.handle("inbox:delete", (_, slug) => {
    const inboxPath = getInboxPath();
    const filepath = path.join(inboxPath, `${slug}.md`);
    if (!fs__namespace.existsSync(filepath)) return;
    let content = fs__namespace.readFileSync(filepath, "utf-8");
    content = content.replace(/^status:.*$/m, "status: deleted");
    fs__namespace.writeFileSync(filepath, content, "utf-8");
  });
  electron.ipcMain.handle("inbox:archive", (_, slug) => {
    const inboxPath = getInboxPath();
    const archivePath = getArchivePath();
    const src = path.join(inboxPath, `${slug}.md`);
    if (!fs__namespace.existsSync(src)) return;
    const dest = path.join(archivePath, `${slug}.md`);
    if (!fs__namespace.existsSync(archivePath)) {
      fs__namespace.mkdirSync(archivePath, { recursive: true });
    }
    fs__namespace.copyFileSync(src, dest);
    let content = fs__namespace.readFileSync(src, "utf-8");
    content = content.replace(/^status:.*$/m, "status: archived");
    fs__namespace.writeFileSync(src, content, "utf-8");
  });
  electron.ipcMain.handle("inbox:select-folder", async () => {
    const result = await electron.dialog.showOpenDialog({ properties: ["openDirectory"] });
    return result.canceled ? null : result.filePaths[0];
  });
  electron.ipcMain.handle("mcp:process-input", async (_, { type, content }) => {
    if (!mcpProcess) {
      const inboxPath = getInboxPath();
      const slug = `${type}-${Date.now()}`;
      const fm = [
        "---",
        `type: ${type}`,
        `title: "${content.slice(0, 50).replace(/"/g, '\\"')}"`,
        `created: ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}`,
        `updated: ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}`,
        "tags: [app]",
        "source: app",
        "status: ready",
        "---",
        "",
        "## Content",
        "",
        content
      ].join("\n");
      fs__namespace.writeFileSync(path.join(inboxPath, `${slug}.md`), fm, "utf-8");
      return { slug };
    }
    let toolName;
    let toolArgs = { content };
    if (type === "todo") {
      toolName = "process_todo";
      toolArgs = { content: content.replace(/^todo\s+/i, "") };
    } else if (type === "link") {
      toolName = "process_link";
      toolArgs = { url: content };
    } else if (type === "research") {
      toolName = "process_note";
      toolArgs = { content, intent: "研究" };
    } else {
      toolName = "process_note";
      toolArgs = { content };
    }
    const result = await callMcpTool(toolName, toolArgs);
    return result;
  });
  startMcpProcess();
}
electron.app.whenReady().then(() => {
  createWindow();
  setupIPC();
  setupWatcher();
});
electron.app.on("window-all-closed", () => {
  watcher == null ? void 0 : watcher.close();
  mcpProcess == null ? void 0 : mcpProcess.kill();
  win = null;
});
electron.app.on("activate", () => {
  if (!win) createWindow();
});
