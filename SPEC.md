# AI-inbox 桌面应用 — 设计规格书

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

## 6. 主界面布局

```
┌──────────────────────────────────────────────────────────────┐
│ NAV: [🔍 搜索框...]                    Write Read    ⚙     │
├────────────────────────────────┬─────────────────────────────┤
│                                │                             │
│  输入区（顶部）                  │                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 输入文字、粘贴链接或图片...                               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                │                             │
│  瀑布流卡片区（按天分组）         │  日历组件                   │
│                                │  [◀ 2026年4月  today]       │
│  今天                           │  [日 一 二 三 四 五 六]    │
│  ┌─────┐ ┌───────┐ ┌─────┐   │  [当月日期网格]             │
│  │Card │ │ Card  │ │Card │   │                            │
│  └─────┘ └───────┘ └─────┘   │  ─────────────────────────  │
│                                │                             │
│  昨天                          │  待办列表（来自 todo 文件）   │
│  ┌───────┐ ┌─────┐           │                            │
│  │ Card  │ │Card │           │  卡片详情                   │
│  └───────┘ └─────┘           │  （点击左区卡片后展开）      │
│                                │                             │
└────────────────────────────────┴─────────────────────────────┘
```

### 6.1 卡片

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
- 状态标签为圆角胶囊，可点击切换
- 点击卡片 → 右侧展开详情预览

**卡片类型与配色（来自 DESIGN.md）：**

| 类型 | 配色 |
|------|------|
| todo | #097FE8（蓝） |
| link | #097FE8（蓝） |
| note | #FABB18（黄） |
| research | #FABB18（黄） |
| image | #3C9BE0（青） |
| source | #DADADA（灰） |

### 6.2 日历组件

- 月份标题 + "today" 按钮 + 左右翻月
- 7 列网格（Sun-Sat）
- 当天高亮：黄色
- 非当月日期：30% 透明度
- 点击日期 → 筛选该日期的卡片；再次点击 / 点击空白 → 清空筛选

### 6.3 搜索

- 输入框实时搜索
- 搜索范围：文件名 + frontmatter title + body 正文
- 模糊匹配，不请求 main process（内存中过滤）

### 6.4 Write / Read 模式

导航栏上的 Write / Read 是视图切换按钮：

| 模式 | 内容 |
|------|------|
| Write（默认） | 输入区 + 瀑布流卡片 + 审阅操作 |
| Read | RSS 阅读模块（后续 Phase 3 实现，本版本忽略） |

---

## 7. 设置页面

**路由：** `/settings`（独立页面）

**通过导航栏右上角 ⚙ 图标进入。**

### 7.1 可配置项

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| ai-inbox 目录 | `~/ai-inbox/` | inbox 文件根目录 |
| 归档目录 | `~/lzm/llm-wiki/MyNote/` | Obsidian 知识库路径 |
| MCP HTTP 端口 | `3100` | HTTP MCP 服务监听端口 |

### 7.2 MCP Config 展示

展示完整的 MCP server JSON 配置，包含：
- stdio 连接命令和参数（指向 app 内置资源路径）
- HTTP 连接 URL（localhost:port/mcp）

提供「复制」按钮，一键复制到剪贴板。

---

## 8. 数据存储

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
- [ ] Electron + Vue 3 项目骨架搭建
- [ ] 内置 MCP 服务端（stdio + HTTP）
- [ ] 主界面瀑布流卡片布局
- [ ] 输入区（文字 / URL / 图片）
- [ ] 文件读写（main process fs API）
- [ ] 状态切换（ready / working / finished）
- [ ] 归档操作（复制到 Obsidian）
- [ ] 软删除操作
- [ ] 日历组件 + 日期筛选
- [ ] 全文搜索
- [ ] 设置页面（路径配置 + MCP config 展示）
- [ ] MCP Config 一键复制

### Phase 3（后续）
- [ ] RSS 阅读模块（Read 模式）
- [ ] 通知系统
- [ ] 多端同步
