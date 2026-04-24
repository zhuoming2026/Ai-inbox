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
function normalizeFrontmatter(frontmatter) {
  const nextFrontmatter = { ...frontmatter };
  if (typeof nextFrontmatter.status === "string" && typeof nextFrontmatter.bucket !== "string") {
    if (nextFrontmatter.status === "deleted") nextFrontmatter.bucket = "deleted";
    if (nextFrontmatter.status === "archived" || nextFrontmatter.status === "finished") nextFrontmatter.bucket = "collected";
  }
  if (typeof nextFrontmatter.bucket !== "string") {
    nextFrontmatter.bucket = "inbox";
  }
  if (typeof nextFrontmatter.enrichStatus !== "string") {
    nextFrontmatter.enrichStatus = "none";
  }
  if (!Array.isArray(nextFrontmatter.tags)) {
    nextFrontmatter.tags = [];
  }
  return nextFrontmatter;
}
function syncFrontmatterBucket(frontmatter, bucket) {
  const nextFrontmatter = {
    ...frontmatter,
    bucket
  };
  const currentStatus = typeof nextFrontmatter.status === "string" ? nextFrontmatter.status : void 0;
  if (bucket === "deleted") {
    nextFrontmatter.status = "deleted";
    return nextFrontmatter;
  }
  if (bucket === "collected") {
    if (!currentStatus || currentStatus === "ready" || currentStatus === "deleted") {
      nextFrontmatter.status = "archived";
    }
    return nextFrontmatter;
  }
  if (!currentStatus || currentStatus === "deleted" || currentStatus === "archived") {
    nextFrontmatter.status = "ready";
  }
  return nextFrontmatter;
}
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: normalizeFrontmatter({}), body: content };
  const frontmatter = {};
  for (const line of match[1].split("\n")) {
    const [key, ...rest] = line.split(":");
    if (!key || rest.length === 0) continue;
    const rawValue = rest.join(":").trim();
    if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
      frontmatter[key.trim()] = rawValue.slice(1, -1);
      continue;
    }
    if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      try {
        frontmatter[key.trim()] = JSON.parse(rawValue);
      } catch {
        frontmatter[key.trim()] = rawValue;
      }
      continue;
    }
    frontmatter[key.trim()] = rawValue;
  }
  return { frontmatter: normalizeFrontmatter(frontmatter), body: match[2] };
}
function buildFrontmatter(frontmatter, body) {
  const lines = Object.entries(frontmatter).map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
  return `---
${lines.join("\n")}
---

${body}`;
}
function detectDocumentType(slug) {
  if (slug.startsWith("todo-")) return "todo";
  if (slug.startsWith("image-")) return "image";
  if (slug.startsWith("link-")) return "link";
  if (slug.startsWith("research-")) return "research";
  return "note";
}
function toInboxDocument(params) {
  const { frontmatter, body } = parseFrontmatter(params.content);
  return {
    slug: params.slug,
    type: detectDocumentType(params.slug),
    filename: params.filename || `${params.slug}.md`,
    created: params.created,
    frontmatter,
    body,
    raw: params.content
  };
}
function slugify(value) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "item";
}
function formatDate(date) {
  return date.toISOString().split("T")[0];
}
function detectRawInputType(typeHint, content) {
  if (typeHint === "image") return "image";
  const trimmed = content.trim();
  if (/^https?:\/\//i.test(trimmed)) return "url";
  return "text";
}
function classifyInput(input) {
  const trimmed = input.content.trim();
  const rawInputType = detectRawInputType(input.type, trimmed);
  if (input.type === "todo" || /^todo\s+/i.test(trimmed)) {
    return { rawInputType: "text", documentType: "todo", normalizedContent: trimmed.replace(/^todo\s+/i, "").trim() };
  }
  if (input.type === "research" || /^研究\s+/u.test(trimmed)) {
    return { rawInputType: "text", documentType: "research", normalizedContent: trimmed.replace(/^研究\s+/u, "").trim() };
  }
  if (input.type === "note" || /^记录\s+/u.test(trimmed)) {
    return { rawInputType: "text", documentType: "note", normalizedContent: trimmed.replace(/^记录\s+/u, "").trim() };
  }
  if (rawInputType === "url") {
    return { rawInputType, documentType: "link", normalizedContent: trimmed };
  }
  if (rawInputType === "image") {
    return { rawInputType, documentType: "image", normalizedContent: trimmed };
  }
  return { rawInputType, documentType: "note", normalizedContent: trimmed };
}
function getInitialEnrichStatus(settings) {
  return (settings == null ? void 0 : settings.aiProcessingMode) === "enhance" && (settings == null ? void 0 : settings.aiConnectionVerified) ? "fetching" : "none";
}
function baseFrontmatter(params) {
  const frontmatter = {
    type: params.type,
    title: params.title || "Untitled",
    created: params.today,
    updated: params.today,
    tags: [params.type],
    source: params.source,
    bucket: "inbox",
    parseMode: params.parseMode || "deterministic",
    enrichStatus: params.enrichStatus || "none",
    aiProvider: params.aiProvider || "none",
    rawInputType: params.rawInputType
  };
  if (params.enrichError) {
    frontmatter.enrichError = params.enrichError;
  }
  return frontmatter;
}
function createDraft(classification, input, now, deps) {
  var _a;
  const today = formatDate(now);
  const source = input.source || "app";
  const enrichStatus = getInitialEnrichStatus(deps.settings);
  const aiProvider = enrichStatus === "fetching" ? ((_a = deps.settings) == null ? void 0 : _a.aiProvider) || "none" : "none";
  switch (classification.documentType) {
    case "todo": {
      if (!classification.normalizedContent) {
        throw new Error("TODO 内容不能为空");
      }
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const slug = `todo-${month}`;
      const line = `- [ ] ${classification.normalizedContent}`;
      const existing = deps.readDocument(slug);
      if (!existing) {
        return {
          slug,
          frontmatter: baseFrontmatter({
            type: "todo",
            title: `Todo ${month}`,
            today,
            source,
            rawInputType: classification.rawInputType,
            enrichStatus,
            aiProvider
          }),
          body: ["## Content", "", line].join("\n")
        };
      }
      const { frontmatter, body } = parseFrontmatter(existing);
      return {
        slug,
        frontmatter: {
          ...frontmatter,
          updated: today,
          parseMode: "deterministic",
          enrichStatus,
          aiProvider,
          rawInputType: classification.rawInputType
        },
        body: `${body.trim()}
${line}
`
      };
    }
    case "link": {
      const parsed = new URL(classification.normalizedContent);
      const title = parsed.hostname.replace(/^www\./, "") || classification.normalizedContent;
      return {
        slug: `link-${Date.now()}-${slugify(title)}`,
        frontmatter: baseFrontmatter({
          type: "link",
          title,
          today,
          source,
          rawInputType: classification.rawInputType,
          enrichStatus,
          aiProvider
        }),
        body: [
          "## Content",
          "",
          `来源链接：${classification.normalizedContent}`,
          "",
          `域名：${parsed.hostname}`,
          "",
          "## Raw",
          "",
          `[打开原文](${classification.normalizedContent})`
        ].join("\n")
      };
    }
    case "research":
    case "note": {
      if (!classification.normalizedContent) {
        throw new Error("输入内容不能为空");
      }
      const title = classification.normalizedContent.split("\n")[0].slice(0, 50);
      return {
        slug: `${classification.documentType}-${Date.now()}-${slugify(title)}`,
        frontmatter: baseFrontmatter({
          type: classification.documentType,
          title,
          today,
          source,
          rawInputType: classification.rawInputType,
          enrichStatus,
          aiProvider
        }),
        body: ["## Content", "", classification.normalizedContent].join("\n")
      };
    }
    case "image": {
      const title = classification.normalizedContent.slice(0, 50) || `Image ${today}`;
      return {
        slug: `image-${Date.now()}-${slugify(title)}`,
        frontmatter: baseFrontmatter({
          type: "image",
          title,
          today,
          source,
          rawInputType: classification.rawInputType,
          enrichStatus,
          aiProvider
        }),
        body: [
          "## Content",
          "",
          classification.normalizedContent || "图片已收件，等待后续 OCR/描述增强。"
        ].join("\n")
      };
    }
  }
}
function createFallbackDraft(input, now, error) {
  const today = formatDate(now);
  const message = error instanceof Error ? error.message : "Unknown pipeline error";
  const rawContent = input.content.trim() || "Untitled";
  return {
    slug: `note-${Date.now()}-${slugify(rawContent)}`,
    frontmatter: baseFrontmatter({
      type: "note",
      title: rawContent.split("\n")[0].slice(0, 50) || "Untitled",
      today,
      source: input.source || "app",
      rawInputType: detectRawInputType(input.type, input.content),
      parseMode: "fallback",
      enrichStatus: "failed",
      aiProvider: "none",
      enrichError: message
    }),
    body: ["## Content", "", input.content].join("\n")
  };
}
async function processInputPipeline(input, deps) {
  const now = deps.now || /* @__PURE__ */ new Date();
  let draft;
  let documentType;
  let parseMode = "deterministic";
  let enrichStatus = getInitialEnrichStatus(deps.settings);
  try {
    const classification = classifyInput(input);
    documentType = classification.documentType;
    draft = createDraft(classification, input, now, deps);
  } catch (error) {
    draft = createFallbackDraft(input, now, error);
    documentType = "note";
    parseMode = "fallback";
    enrichStatus = "failed";
  }
  deps.writeDocument(draft.slug, buildFrontmatter(draft.frontmatter, draft.body));
  return {
    slug: draft.slug,
    parseMode,
    enrichStatus,
    documentType
  };
}
function normalizeProvider(settings) {
  if (settings.aiProvider === "ollama") return "ollama";
  if (settings.aiProvider === "minimax") return "minimax";
  return "openai";
}
function requireModel(settings) {
  var _a;
  if (!((_a = settings.model) == null ? void 0 : _a.trim())) {
    throw new Error("请先填写模型名称");
  }
}
function buildOpenAIBaseUrl(settings) {
  var _a;
  const provider = normalizeProvider(settings);
  if ((_a = settings.baseUrl) == null ? void 0 : _a.trim()) {
    const trimmed = settings.baseUrl.trim().replace(/\/$/, "");
    return trimmed.endsWith("/chat/completions") ? trimmed : `${trimmed}/chat/completions`;
  }
  if (provider === "openai") {
    return "https://api.openai.com/v1/chat/completions";
  }
  throw new Error("请先填写 Base URL");
}
function buildOllamaBaseUrl(settings) {
  var _a;
  const trimmed = (_a = settings.baseUrl) == null ? void 0 : _a.trim().replace(/\/$/, "");
  return trimmed ? `${trimmed}/api/chat` : "http://127.0.0.1:11434/api/chat";
}
async function requestOpenAICompatible(settings, prompt, system) {
  var _a, _b, _c, _d;
  requireModel(settings);
  if (!((_a = settings.apiKey) == null ? void 0 : _a.trim())) {
    throw new Error("请先填写 API Key");
  }
  const model = settings.model.trim();
  const response = await fetch(buildOpenAIBaseUrl(settings), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey.trim()}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ]
    })
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `AI 请求失败 (${response.status})`);
  }
  const data = JSON.parse(text);
  return ((_d = (_c = (_b = data == null ? void 0 : data.choices) == null ? void 0 : _b[0]) == null ? void 0 : _c.message) == null ? void 0 : _d.content) || "";
}
async function requestOllama(settings, prompt, system) {
  var _a;
  requireModel(settings);
  const model = settings.model.trim();
  const response = await fetch(buildOllamaBaseUrl(settings), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ],
      format: "json"
    })
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `Ollama 请求失败 (${response.status})`);
  }
  const data = JSON.parse(text);
  return ((_a = data == null ? void 0 : data.message) == null ? void 0 : _a.content) || "";
}
function extractJsonObject(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("AI 返回内容不是有效 JSON");
    }
    return JSON.parse(match[0]);
  }
}
async function requestJson(settings, prompt, system) {
  const provider = normalizeProvider(settings);
  const raw = provider === "ollama" ? await requestOllama(settings, prompt, system) : await requestOpenAICompatible(settings, prompt, system);
  return extractJsonObject(raw);
}
async function testAiConnection(settings) {
  const json = await requestJson(
    settings,
    '返回 JSON：{"ok": true, "message": "pong"}',
    "你是一个连接测试助手。只返回 JSON。"
  );
  if (!(json == null ? void 0 : json.ok)) {
    throw new Error("AI 测试请求没有返回预期结果");
  }
  return {
    ok: true,
    message: typeof json.message === "string" ? json.message : "连接成功"
  };
}
async function enrichDocumentContent(raw, settings) {
  const { frontmatter, body } = parseFrontmatter(raw);
  const prompt = [
    "请根据下面的文档返回 JSON，字段仅包含 title、tags、body。",
    "要求：",
    "1. 保留原始信息，不要发明事实。",
    "2. body 使用 Markdown，适当整理结构。",
    "3. tags 返回字符串数组，最多 5 个。",
    "",
    "Frontmatter:",
    JSON.stringify(frontmatter, null, 2),
    "",
    "Body:",
    body
  ].join("\n");
  const json = await requestJson(
    settings,
    prompt,
    "你是一个收件箱内容整理助手。你会把现有文档整理得更清晰，但不改变事实。只返回 JSON。"
  );
  return {
    title: typeof (json == null ? void 0 : json.title) === "string" ? json.title : void 0,
    tags: Array.isArray(json == null ? void 0 : json.tags) ? json.tags.filter((tag) => typeof tag === "string").slice(0, 5) : void 0,
    body: typeof (json == null ? void 0 : json.body) === "string" ? json.body : void 0
  };
}
function applyEnrichmentToRaw(raw, enrichment, meta) {
  var _a;
  const { frontmatter, body } = parseFrontmatter(raw);
  const nextFrontmatter = {
    ...frontmatter,
    updated: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    enrichStatus: meta.status,
    aiProvider: meta.provider || "none"
  };
  if (enrichment.title) nextFrontmatter.title = enrichment.title;
  if ((_a = enrichment.tags) == null ? void 0 : _a.length) nextFrontmatter.tags = enrichment.tags;
  if (meta.error) {
    nextFrontmatter.enrichError = meta.error;
  } else {
    delete nextFrontmatter.enrichError;
  }
  return buildFrontmatter(nextFrontmatter, enrichment.body || body);
}
const defaultThemeConfigs = {
  light: {
    codeThemeId: "github-light",
    variant: "light",
    theme: {
      accent: "#fabb18",
      contrast: 40,
      fonts: {
        ui: "PingFang SC, SF Pro Display, Helvetica Neue, Noto Sans SC",
        code: '"SF Mono", "JetBrains Mono", monospace'
      },
      ink: "#1a1a1a",
      opaqueWindows: true,
      semanticColors: {
        diffAdded: "#00a76f",
        diffRemoved: "#d94841",
        skill: "#fabb18"
      },
      surface: "#f5f4ed"
    }
  },
  dark: {
    codeThemeId: "github-dark",
    variant: "dark",
    theme: {
      accent: "#fabb18",
      contrast: 62,
      fonts: {
        ui: "PingFang SC, SF Pro Display, Helvetica Neue, Noto Sans SC",
        code: '"SF Mono", "JetBrains Mono", monospace'
      },
      ink: "#f5f4ed",
      opaqueWindows: true,
      semanticColors: {
        diffAdded: "#22c55e",
        diffRemoved: "#ff6b57",
        skill: "#fabb18"
      },
      surface: "#1a1a1a"
    }
  },
  notion: {
    codeThemeId: "absolutely",
    variant: "light",
    theme: {
      accent: "#cc7d5e",
      contrast: 40,
      fonts: {
        ui: "PingFang SC, SF Pro Display, Helvetica Neue, Noto Sans SC",
        code: '"SF Mono", "Geist Mono", ui-monospace'
      },
      ink: "#2d2d2b",
      opaqueWindows: true,
      semanticColors: {
        diffAdded: "#00c853",
        diffRemoved: "#ff5f38",
        skill: "#cc7d5e"
      },
      surface: "#f9f9f7"
    }
  },
  claude: {
    codeThemeId: "warm-neutral",
    variant: "light",
    theme: {
      accent: "#c26d47",
      contrast: 52,
      fonts: {
        ui: "PingFang SC, SF Pro Display, Helvetica Neue, Noto Sans SC",
        code: '"SF Mono", "Geist Mono", ui-monospace'
      },
      ink: "#2d2a26",
      opaqueWindows: true,
      semanticColors: {
        diffAdded: "#2f9e62",
        diffRemoved: "#d94841",
        skill: "#c26d47"
      },
      surface: "#fef9f5"
    }
  }
};
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
    aiProcessingMode: "off",
    aiConnectionVerified: false,
    themeMode: "system",
    lightTheme: "light",
    darkTheme: "dark",
    editorTypographyTheme: "typora-github",
    editorCodeTheme: "github",
    customThemes: defaultThemeConfigs
  }
});
let mcpProcess = null;
const mcpPendingRequests = /* @__PURE__ */ new Map();
let mcpLastError = null;
function getMcpServerPath() {
  const appPath = electron.app.isPackaged ? path.join(process.resourcesPath, "mcp-child.js") : path.join(electron.app.getPath("home"), "ai-inbox-mcp", "dist", "index.js");
  return appPath;
}
function getMcpStatus() {
  return {
    running: Boolean(mcpProcess),
    error: mcpLastError
  };
}
function startMcpProcess() {
  var _a, _b;
  if (mcpProcess) {
    mcpLastError = null;
    return getMcpStatus();
  }
  const mcpPath = getMcpServerPath();
  if (!fs__namespace.existsSync(mcpPath)) {
    mcpLastError = `MCP server not found at: ${mcpPath}`;
    console.error("[ai-inbox]", mcpLastError);
    return getMcpStatus();
  }
  mcpProcess = child_process.spawn("node", [mcpPath], {
    stdio: ["pipe", "pipe", "pipe"]
  });
  mcpLastError = null;
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
    mcpLastError = data.toString().trim() || "MCP process reported an error";
    console.error("[ai-inbox] MCP stderr:", data.toString());
  });
  mcpProcess.on("exit", (code) => {
    console.error("[ai-inbox] MCP process exited with code:", code);
    mcpProcess = null;
    if (code && code !== 0) {
      mcpLastError = `MCP process exited with code ${code}`;
    }
  });
  return getMcpStatus();
}
function stopMcpProcess() {
  if (mcpProcess) {
    mcpProcess.kill();
    mcpProcess = null;
  }
  mcpPendingRequests.clear();
  mcpLastError = null;
  return getMcpStatus();
}
function getInboxPath() {
  const p = store.get("inboxPath");
  return p.startsWith("~/") ? path.join(electron.app.getPath("home"), p.slice(2)) : p;
}
function getArchivePath() {
  const p = store.get("archivePath");
  return p.startsWith("~/") ? path.join(electron.app.getPath("home"), p.slice(2)) : p;
}
function getAiSettings() {
  return {
    aiProvider: store.get("aiProvider"),
    apiKey: store.get("apiKey"),
    model: store.get("model"),
    baseUrl: store.get("baseUrl"),
    aiProcessingMode: store.get("aiProcessingMode"),
    aiConnectionVerified: Boolean(store.get("aiConnectionVerified"))
  };
}
function getInboxFilePath(slug) {
  return path.join(getInboxPath(), `${slug}.md`);
}
function getScratchpadPath() {
  return path.join(electron.app.getPath("userData"), "scratchpad.md");
}
function setDocumentEnrichStatus(slug, status, error) {
  const filepath = getInboxFilePath(slug);
  if (!fs__namespace.existsSync(filepath)) return;
  const raw = fs__namespace.readFileSync(filepath, "utf-8");
  const { frontmatter, body } = parseFrontmatter(raw);
  const nextFrontmatter = {
    ...frontmatter,
    updated: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    enrichStatus: status
  };
  if (error) {
    nextFrontmatter.enrichError = error;
  } else {
    delete nextFrontmatter.enrichError;
  }
  fs__namespace.writeFileSync(filepath, buildFrontmatter(nextFrontmatter, body), "utf-8");
}
function setDocumentBucket(slug, bucket) {
  const filepath = getInboxFilePath(slug);
  if (!fs__namespace.existsSync(filepath)) return;
  const raw = fs__namespace.readFileSync(filepath, "utf-8");
  const { frontmatter, body } = parseFrontmatter(raw);
  fs__namespace.writeFileSync(
    filepath,
    buildFrontmatter(
      syncFrontmatterBucket({
        ...frontmatter,
        updated: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
      }, bucket),
      body
    ),
    "utf-8"
  );
}
function readScratchpad() {
  const filepath = getScratchpadPath();
  if (!fs__namespace.existsSync(filepath)) {
    return "";
  }
  return fs__namespace.readFileSync(filepath, "utf-8");
}
function writeScratchpad(content) {
  fs__namespace.writeFileSync(getScratchpadPath(), content, "utf-8");
}
async function enrichDocumentBySlug(slug) {
  const filepath = getInboxFilePath(slug);
  if (!fs__namespace.existsSync(filepath)) {
    throw new Error("文件不存在");
  }
  const settings = getAiSettings();
  if (!settings.aiConnectionVerified) {
    throw new Error("AI 尚未通过测试，请先在设置页测试连接");
  }
  setDocumentEnrichStatus(slug, "fetching");
  try {
    const raw = fs__namespace.readFileSync(filepath, "utf-8");
    const enrichment = await enrichDocumentContent(raw, settings);
    const nextRaw = applyEnrichmentToRaw(raw, enrichment, {
      provider: settings.aiProvider || "none",
      status: "success"
    });
    fs__namespace.writeFileSync(filepath, nextRaw, "utf-8");
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI enrich failed";
    setDocumentEnrichStatus(slug, "failed", message);
    throw error;
  }
}
function scheduleAutoEnrich(slug) {
  queueMicrotask(async () => {
    try {
      await enrichDocumentBySlug(slug);
    } catch (error) {
      console.error("[ai-inbox] auto enrich failed:", error);
    }
  });
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
  electron.ipcMain.handle("ai:test", async (_, settings) => {
    const candidate = {
      ...getAiSettings(),
      ...settings
    };
    const result = await testAiConnection(candidate);
    return result;
  });
  electron.ipcMain.handle("ai:enrich", async (_, slug) => {
    await enrichDocumentBySlug(slug);
    return { ok: true };
  });
  electron.ipcMain.handle("scratchpad:read", () => readScratchpad());
  electron.ipcMain.handle("scratchpad:write", (_, content) => {
    writeScratchpad(content);
  });
  electron.ipcMain.handle("mcp:status", () => getMcpStatus());
  electron.ipcMain.handle("mcp:start", () => startMcpProcess());
  electron.ipcMain.handle("mcp:stop", () => stopMcpProcess());
  electron.ipcMain.handle("inbox:list", () => {
    const inboxPath = getInboxPath();
    if (!fs__namespace.existsSync(inboxPath)) return [];
    const files = fs__namespace.readdirSync(inboxPath).filter((f) => f.endsWith(".md"));
    return files.map((filename) => {
      const filepath = path.join(inboxPath, filename);
      const stats = fs__namespace.statSync(filepath);
      const content = fs__namespace.readFileSync(filepath, "utf-8");
      const slug = filename.replace(".md", "");
      return toInboxDocument({
        slug,
        filename,
        content,
        created: stats.birthtime.toISOString()
      });
    }).sort((a, b) => b.created > a.created ? 1 : -1);
  });
  electron.ipcMain.handle("inbox:read", (_, slug) => {
    const inboxPath = getInboxPath();
    const filename = slug.endsWith(".md") ? slug : `${slug}.md`;
    const filepath = path.join(inboxPath, filename);
    if (!fs__namespace.existsSync(filepath)) return null;
    const stats = fs__namespace.statSync(filepath);
    const content = fs__namespace.readFileSync(filepath, "utf-8");
    return toInboxDocument({
      slug: filename.replace(".md", ""),
      filename,
      content,
      created: stats.birthtime.toISOString()
    });
  });
  electron.ipcMain.handle("inbox:read-raw", (_, slug) => {
    const filepath = getInboxFilePath(slug);
    if (!fs__namespace.existsSync(filepath)) return null;
    return fs__namespace.readFileSync(filepath, "utf-8");
  });
  electron.ipcMain.handle("inbox:write", (_, slug, data) => {
    const inboxPath = getInboxPath();
    const filepath = path.join(inboxPath, `${slug}.md`);
    if (!fs__namespace.existsSync(filepath)) return;
    const current = fs__namespace.readFileSync(filepath, "utf-8");
    const { frontmatter, body } = parseFrontmatter(current);
    const nextFrontmatter = { ...frontmatter, ...data.frontmatter || {} };
    const nextBody = data.body ?? body;
    fs__namespace.writeFileSync(filepath, buildFrontmatter(nextFrontmatter, nextBody), "utf-8");
  });
  electron.ipcMain.handle("inbox:write-raw", (_, slug, raw) => {
    const filepath = getInboxFilePath(slug);
    if (!fs__namespace.existsSync(filepath)) return;
    fs__namespace.writeFileSync(filepath, raw, "utf-8");
  });
  electron.ipcMain.handle("inbox:set-bucket", (_, slug, bucket) => {
    setDocumentBucket(slug, bucket);
  });
  electron.ipcMain.handle("inbox:delete", (_, slug) => {
    setDocumentBucket(slug, "deleted");
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
    setDocumentBucket(slug, "collected");
  });
  electron.ipcMain.handle("inbox:select-folder", async () => {
    const result = await electron.dialog.showOpenDialog({ properties: ["openDirectory"] });
    return result.canceled ? null : result.filePaths[0];
  });
  electron.ipcMain.handle("mcp:process-input", async (_, { type, content }) => {
    const result = await processInputPipeline(
      { type, content, source: "app" },
      {
        settings: getAiSettings(),
        readDocument: (slug) => {
          const filepath = getInboxFilePath(slug);
          return fs__namespace.existsSync(filepath) ? fs__namespace.readFileSync(filepath, "utf-8") : null;
        },
        writeDocument: (slug, raw) => {
          const inboxPath = getInboxPath();
          if (!fs__namespace.existsSync(inboxPath)) {
            fs__namespace.mkdirSync(inboxPath, { recursive: true });
          }
          fs__namespace.writeFileSync(getInboxFilePath(slug), raw, "utf-8");
        }
      }
    );
    if (result.enrichStatus === "fetching") {
      scheduleAutoEnrich(result.slug);
    }
    return result;
  });
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
