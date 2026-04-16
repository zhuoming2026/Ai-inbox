# AI-inbox 桌面应用 — 设计规格书

## 0. 设计稿来源

**Figma 文件：** https://www.figma.com/design/aiEpfdX3SRFIbCJiD1KxNw/AI-inbox

**MCP 服务名称：** `figma-developer-mcp`（通过 Hermes 的 `mcporter` 调用）

**读取节点数据：**
```
mcporter call figma-developer-mcp.get_figma_data \
  fileKey="aiEpfdX3SRFIbCJiD1KxNw" \
  nodeId="<节点ID>"
```

**下载切图：**
```
mcporter call figma-developer-mcp.download_figma_images \
  fileKey="aiEpfdX3SRFIbCJiD1KxNw" \
  nodes='[{"nodeId":"<节点ID>","fileName":"output.png"}]' \
  localPath="~/Downloads"
```

**设计稿节点对照：**

| 节点 ID | 页面 |
|---------|------|
| 2013-294 | 首页（主页面） |
| 2024-2246 | 文件编辑/阅读页 |
| 待补充 | 设置页 |

> 设置页暂无 Figma 设计稿，实现时按功能需求开发，不做过度设计。

---

## 1. 项目概述

**项目目标：** 打造私人信息收件箱，AI 通过 MCP 预处理输入信息，用户在桌面端审阅后归档到 Obsidian 知识库。

**技术栈：**
- 桌面框架：Electron
- 前端：Vue 3 + Vite + TypeScript
- 状态管理：Pinia
- 构建工具：electron-builder

**核心特点：**
- App 内置 MCP 服务端（同时暴露 stdio + HTTP），安装后即可供其他 AI 工具连接
- 用户在 app 内输入信息 → MCP 处理 → 存入 inbox 文件夹
- 用户在 app 内审阅卡片 → 切换状态 / 归档 / 软删除

---

## 2. 整体架构

```
┌──────────────────────────────────────────────────────────────┐
│  Electron App                                                │
│                                                              │
│  main process                                                │
│  ├── BrowserWindow (Vue 3 renderer)                         │
│  ├── FileWatcher (chokidar 监听 inbox 目录 → IPC 刷新 UI)    │
│  ├── SettingsStore (electron-store, 持久化用户配置)          │
│  ├── MCP HTTP Server (localhost:3100, /mcp 端点)            │
│  └── MCP Stdio (fork child_process)                          │
│         │                                                    │
│         ├── AI 客户端 stdio 连接                             │
│         └── AI 客户端 HTTP SSE 连接 (localhost:3100/mcp)     │
└──────────────────────────────────────────────────────────────┘
                              │
                    读写 ~/ai-inbox/*.md
                              │
               ┌──────────────┴──────────────┐
               │                             │
          inbox 文件夹                  Obsidian 归档目录
          ~/ai-inbox/                  ~/lzm/llm-wiki/MyNote/
          (原件保留)                   (副本)
```

**数据流：**
1. 用户在输入框输入 / AI 客户端通过 MCP 写入 → `~/ai-inbox/*.md`
2. chokidar 检测到文件变化 → IPC → renderer 刷新卡片列表
3. 用户审阅卡片 → 切换状态 / 归档（复制到 Obsidian）/ 软删除
4. 所有文件操作均通过 Electron main process 的 fs API，renderer 不直接操作文件

---

## 3. MCP 服务端

### 3.1 传输方式

| 方式 | 说明 |
|------|------|
| **Stdio** | fork 子进程，path 指向 app 内置资源路径，供 Claude Desktop 等 stdio 客户端使用 |
| **HTTP** | main process 内置 HTTP server，`localhost:3100/mcp` 端点，供支持 SSE 的 AI 客户端使用 |

### 3.2 工具集（9 个）

| 工具 | 作用 | 生成文件 status |
|------|------|----------------|
| `process_todo` | 追加 TODO 到当月 `todo-YYYY-MM.md` | ready |
| `process_note` | 文本 → 结构化 Markdown | ready |
| `process_link` | URL → Jina Reader 抓取 → Markdown | ready |
| `process_image` | 下载图片 + OCR 占位符 Markdown | ready |
| `detect_intent` | 关键词识别 → todo/research/record（不写文件） | — |
| `list_inbox` | 列出 inbox 目录文件 | — |
| `get_config` | 返回当前合并后的配置 | — |
| `init_config` | 初始化默认配置到 `~/.ai-inbox-mcp/config.json` | — |
| `reload_config` | 热重载配置 | — |

### 3.3 MCP 生成文件规范

生成文件时 frontmatter 包含：

```yaml
---
type: note | todo | link | image | research
title: "标题"
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [tag1, tag2]
source: app | mcp
status: ready    # MCP 生成时固定为 ready
---
```

### 3.4 MCP Config 配置

设置页面展示 JSON，供用户复制到 Claude Desktop：

```json
{
  "mcpServers": {
    "ai-inbox": {
      "command": "node",
      "args": ["/Applications/AI-inbox.app/Contents/Resources/mcp-child.js"]
    },
    "ai-inbox-http": {
      "url": "http://localhost:3100/mcp"
    }
  }
}
```

---

## 4. 文件状态机

| 状态 | 含义 | 谁能改 |
|------|------|--------|
| `ready` | AI 处理完成，待审阅 | MCP 初始写入 |
| `working` | 用户正在处理 | 用户手动切换 |
| `finished` | 用户处理完毕 | 用户手动切换 |
| `archived` | 已归档（复制到 Obsidian） | 用户点击归档时写入 |
| `deleted` | 软删除，不显示 | 用户点击删除时写入 |

**状态存储位置：** frontmatter 的 `status` 字段。

**归档操作：** 复制文件到 Obsidian 目录，inbox 原件 status 改为 `archived`（不物理删除）。

**删除操作：** frontmatter status 改为 `deleted`，文件物理存在但不显示在卡片列表。

---

## 5. 输入系统

### 5.1 桌面输入区

主界面顶部输入框，支持：

| 输入类型 | 检测方式 | 触发工具 |
|----------|----------|----------|
| 纯文字 | 非 URL 格式 | process_note |
| URL | 以 http(s):// 开头 | process_link |
| 图片 | 粘贴剪贴板图片 | process_image |

**placeholder：** `"输入文字、粘贴链接或图片..."`

**交互：** 输入后按回车触发处理，回车清空输入框，卡片列表自动刷新。

### 5.2 意图前缀识别

输入以以下前缀开头时，调用对应 MCP 工具：

| 前缀 | 工具 |
|------|------|
| `todo ` | process_todo |
| `研究 ` | process_note (type=research) |
| `记录 ` | process_note (type=note) |
| 无前缀 / URL | 默认 process_note / process_link |

---

## 6. 页面结构

本应用共三个页面，通过路由切换：

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 首页（主页） | 输入区 + 瀑布流卡片 + 右侧日历/记事本 |
| `/article/:slug` | 文件编辑/阅读页 | 左侧源码编辑 + 右侧预览，可调比例 |
| `/settings` | 设置页 | AI 配置 + MCP 设置 + 路径设置 |

---

## 6.1 首页（`/`）

```
┌──────────────────────────────────────────────────────────────┐
│ NAV: [🔍 搜索框...]                    Write Read    ⚙     │
├────────────────────────────────┬─────────────────────────────┤
│                                │                             │
│  输入区（顶部）                  │  日历组件                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 输入文字、粘贴链接或图片...                               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                │  [◀ 2026年4月  today]       │
│  瀑布流卡片区（按天分组）         │  [日 一 二 三 四 五 六]    │
│                                │  [当月日期网格]             │
│  今天                           │                            │
│  ┌─────┐ ┌───────┐ ┌─────┐   │  ─────────────────────────  │
│  │Card │ │ Card  │ │Card │   │                             │
│  └─────┘ └───────┘ └─────┘   │  Markdown 小记事本           │
│                                │  ┌──────────────────────┐ │
│  昨天                          │  │ ## 随手记              │ │
│  ┌───────┐ ┌─────┐           │  │                       │ │
│  │ Card  │ │Card │           │  │ 输入备忘...            │ │
│  └───────┘ └─────┘           │  └──────────────────────┘ │
│                                │                             │
└────────────────────────────────┴─────────────────────────────┘
```

**交互：**
- 点击卡片 → 跳转到 `/article/:slug`
- 日历点击日期 → 筛选该日期卡片
- 日历点击 today → 清空日期筛选
- 搜索框实时全文过滤

---

## 6.2 文件编辑/阅读页（`/article/:slug`）

```
┌──────────────────────────────────────────────────────────────┐
│ ← 返回    文件标题                            [归档] [删除]  │
├─────────────────────────────┬────────────────────────────────┤
│                             │                                 │
│  Markdown 源码编辑区         │  Markdown 预览区                 │
│                             │                                 │
│  ## 标题                    │  标题（渲染后）                   │
│                             │                                 │
│  正文内容...                 │  正文内容（渲染后）                │
│                             │                                 │
│  ---                        │  ───                           │
│  tags: [tag1, tag2]         │  tags: tag1, tag2（渲染后）       │
│  status: working           │                                 │
│                             │                                 │
│  [可拖拽分隔条调整比例]        │                                 │
│                             │                                 │
│  [Ready] [Working] [Finished]   │                         │
└─────────────────────────────┴────────────────────────────────┘
```

**交互：**
- 左右比例可拖拽调整（默认 50:50）
- 状态标签（ready / working / finished）可点击切换
- 归档按钮：复制文件到 Obsidian 目录，原件 status 改为 archived
- 删除按钮：frontmatter status 改为 deleted
- 返回：回到首页

---

## 6.3 设置页（`/settings`）

通过导航栏 ⚙ 图标进入。

```
┌──────────────────────────────────────────────────────────────┐
│ ← 返回                        设置                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  AI 配置                                                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 服务商：  [▼ MiniMax        ]                           │ │
│  │ API Key：[••••••••••••••••••]                          │ │
│  │ 模型：    [▼ GPT-4o         ]  （根据服务商联动）        │ │
│  │ 基础 URL：[https://api.minimax.io]  （可选）            │ │
│  │                                                          │ │
│  │ [ 测试连接 ]  （验证 key 是否有效）                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  MCP 服务                                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ HTTP 端口：[3100    ]                                  │ │
│  │ 服务状态：运行中 🟢 / 已停止 🔴                          │ │
│  │                                                          │ │
│  │ MCP Config：                                            │ │
│  │ ┌────────────────────────────────────────────────────┐ │ │
│  │ │ {                                                 │ │ │
│  │ │   "mcpServers": {                                │ │ │
│  │ │     "ai-inbox": { "command": "node", ... }        │ │ │
│  │ │   }                                               │ │ │
│  │ │ }                                                 │ │ │
│  │ └────────────────────────────────────────────────────┘ │ │
│  │                               [ 复制 Config ]           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  路径设置                                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ai-inbox 目录：[~/ai-inbox/          ] [选择文件夹]   │ │
│  │ 归档目录：    [~/lzm/llm-wiki/MyNote/] [选择文件夹]   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 6.4 卡片

**结构：**
```
┌────────────────────────────┐
│ ▌ 标题                     │
│   内容预览文字...           │
│   [Ready] [Working] [Finished]  │
│   2025-04-10 14:32         │
└────────────────────────────┘
```

- 左侧 3px 色条表示卡片类型
- 状态标签为圆角胶囊，可点击切换（仅改 frontmatter status）
- 点击卡片 → 跳转到 `/article/:slug`

**卡片类型与配色（来自 DESIGN.md）：**

| 类型 | 配色 |
|------|------|
| todo | #097FE8（蓝） |
| link | #097FE8（蓝） |
| note | #FABB18（黄） |
| research | #FABB18（黄） |
| image | #3C9BE0（青） |
| source | #DADADA（灰） |

---

## 6.5 日历组件

- 月份标题 + "today" 按钮 + 左右翻月
- 7 列网格（Sun-Sat）
- 当天高亮：黄色
- 非当月日期：30% 透明度
- 点击日期 → 筛选该日期的卡片；再次点击 / 点击空白 → 清空筛选

---

## 6.6 搜索

- 输入框实时搜索
- 搜索范围：文件名 + frontmatter title + body 正文
- 模糊匹配，内存中过滤

---

## 6.7 Write / Read 模式

导航栏上的 Write / Read 是视图切换按钮：

| 模式 | 内容 |
|------|------|
| Write（默认） | 输入区 + 瀑布流卡片 + 审阅操作 |
| Read | RSS 阅读模块（后续 Phase 3 实现，本版本忽略） |

---

## 7. 设置页面

设置页面详细内容见 **6.3 节**。

**配置项汇总：**

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| AI 服务商 | MiniMax | 可选 MiniMax / OpenAI / Ollama |
| API Key | — | 加密存储 |
| AI 模型 | — | 根据服务商联动 |
| AI 基础 URL | — | 可选，自定义端点 |
| MCP HTTP 端口 | `3100` | HTTP MCP 服务监听端口 |
| 主题 | 跟随系统 | 可选浅色 / 深色 / 跟随系统 |
| ai-inbox 目录 | `~/ai-inbox/` | inbox 文件根目录 |
| 归档目录 | `~/lzm/llm-wiki/MyNote/` | Obsidian 知识库路径 |

---

## 8. 主题/样式配置系统

### 8.1 设计原则

样式系统基于 **CSS 变量（Custom Properties）** 实现，所有颜色、间距、圆角均通过变量引用，便于后续换肤。

**默认变量示例（浅色模式）：**

```css
:root {
  /* 背景色 */
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-tertiary: #e8e8e8;

  /* 文字色 */
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --text-muted: #999999;

  /* 卡片类型色 */
  --color-todo: #097FE8;
  --color-note: #FABB18;
  --color-link: #097FE8;
  --color-research: #FABB18;
  --color-image: #3C9BE0;
  --color-source: #DADADA;

  /* 状态色 */
  --status-ready: #097FE8;
  --status-working: #FABB18;
  --status-finished: #1AAE39;

  /* 圆角 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 18px;

  /* 阴影 */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.12);
}
```

**深色模式变量覆盖示例：**

```css
[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2a2a2a;
  --bg-tertiary: #3a3a3a;
  --text-primary: #ffffff;
  --text-secondary: #b0b0b0;
}
```

### 8.2 主题配置存储

electron-store 中主题相关配置：

```json
{
  "theme": {
    "mode": "light | dark | system",
    "customConfig": null | { /* 自定义 CSS 变量 JSON */ }
  }
}
```

### 8.3 预设主题方案

| 主题 ID | 名称 | 说明 |
|---------|------|------|
| `light` | 浅色模式 | 默认浅色 |
| `dark` | 深色模式 | 默认深色 |
| `system` | 跟随系统 | 跟随 macOS 深色/浅色切换 |

### 8.4 自定义主题（未来功能）

**来源一：从配置文件导入**
读取外部 `.json` 格式的主题配置文件，解析其中的 CSS 变量，覆盖默认变量。

**来源二：从设计稿拷贝（AI 辅助）**
支持输入一个网站 URL，AI 分析其配色方案，生成对应的 CSS 变量配置。

**来源三：AI 自动生成**
用户描述一个主题风格（如"赛博朋克"、"莫兰迪色"），AI 生成一套完整的 CSS 变量配置。

> 以上三个来源为预留功能，本阶段（Phase 2.1）仅实现浅色/深色/跟随系统三个预设主题，以及 `theme.customConfig` 的加载和应用框架。

### 8.5 主题切换交互

- 设置页提供主题切换下拉选择器（浅色 / 深色 / 跟随系统）
- 切换后立即生效，无需重启
- 主题配置持久化到 electron-store

---

### 8.1 inbox 文件（`~/ai-inbox/`）

每条信息一个 `.md` 文件，命名规范：`{type}-{slug}-{YYYYMMDD}.md`

示例：
- `note-ai-mcp-20260415.md`
- `link-zhuoming-fun-20260415.md`
- `todo-2026-04.md`（按月合并的 TODO 文件）
- `image-6029de52c491-20260415.md`

### 8.2 配置文件（electron-store）

Electron app 的持久化配置，存储路径由 electron-store 管理：

```json
{
  "inboxPath": "~/ai-inbox/",
  "archivePath": "~/lzm/llm-wiki/MyNote/",
  "mcpHttpPort": 3100
}
```

### 8.3 frontmatter 规范

```yaml
---
type: note | todo | link | image | research
title: "标题"
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [tag1, tag2]
source: app | mcp
status: ready | working | finished | archived | deleted
---
```

---

## 9. 开发阶段

### Phase 2.1（当前）
- [ ] Electron + Vue 3 项目骨架搭建（含路由 vue-router）
- [ ] 内置 MCP 服务端（stdio 子进程 + HTTP server 双传输）
- [ ] 首页：输入区 + 瀑布流卡片布局
- [ ] 首页：右侧日历组件 + Markdown 小记事本
- [ ] 输入区（文字 / URL / 图片 → MCP 处理）
- [ ] 文件读写（main process fs API + IPC）
- [ ] chokidar 文件监听 + renderer 实时刷新
- [ ] 状态切换（ready / working / finished，frontmatter 读写）
- [ ] 归档操作（复制到 Obsidian，原件 status → archived）
- [ ] 软删除操作（status → deleted）
- [ ] 日历组件 + 日期筛选卡片
- [ ] 全文搜索（标题 + 内容模糊匹配）
- [ ] 文件编辑/阅读页（左侧源码 + 右侧预览，可拖拽调比例）
- [ ] 设置页：AI 配置（服务商 / Key / 模型 / 基础 URL）
- [ ] 设置页：AI 连接测试按钮
- [ ] 设置页：MCP 配置展示 + 一键复制
- [ ] 设置页：路径配置（inbox 目录 + 归档目录，可选文件夹选择器）
- [ ] 主题系统框架：CSS 变量基础设施 + 预设浅色/深色/跟随系统主题
- [ ] 设置页：主题切换选择器（浅色 / 深色 / 跟随系统）

### Phase 2.2（后续主题功能）
- [ ] 从外部 JSON 文件导入自定义主题配置
- [ ] 从网站 URL AI 分析配色方案并应用
- [ ] AI 描述生成主题（输入文字，AI 生成 CSS 变量配置）

### Phase 3（后续）
- [ ] RSS 阅读模块（Read 模式）
- [ ] 通知系统
- [ ] 多端同步
