# AI-inbox 个人信息助手 — 设计文档

## 概述

**项目目标：** 打造一个私人信息收件箱，AI 预处理输入信息，用户快速审阅后归档到知识库。

**核心理念：** 入口简单（飞书消息），处理智能（AI 独立完成），归档可控（用户手动审阅）。

**当前状态：** Phase 1（MCP 服务端）已完成，Phase 2（桌面应用）设计中。

---

## 系统架构

```
飞书消息 / Webhook
      ↓
 Hermes Agent（AI 大脑）
      ↓
 ai-inbox MCP Server
      ↓
 ~/ai-inbox/（Markdown 文件）
      ↓
 用户审阅 → 手动归档
      ↓
 ~/lzm/llm-wiki/MyNote/（Obsidian 知识库）
```

### 组件说明

| 组件 | 技术 | 职责 |
|------|------|------|
| 飞书机器人 | lark-cli / OpenClaw | 接收用户消息，作为入口 |
| Hermes Agent | MiniMax-M2 | AI 大脑，独立处理输入，调用 MCP 工具 |
| ai-inbox MCP Server | Node.js/TypeScript | 信息预处理，输出结构化 Markdown |
| AI-inbox 桌面应用 | React/Electron（规划） | 可视化审阅界面 |
| Obsidian 知识库 | 本地文件系统 | 长期存储，带 frontmatter 规范 |

---

## 已实现：ai-inbox MCP Server

**项目路径：** `~/ai-inbox-mcp/`

### 功能

接收 Hermes 的指令，把原始信息转化为结构化的 Markdown 文件，写入 `~/ai-inbox/`。

### MCP 工具（9个）

| 工具 | 作用 |
|------|------|
| `process_todo` | 追加 TODO 到当月 `todo-YYYY-MM.md` |
| `process_image` | 下载图片 + 创建带 OCR 占位符的 Markdown |
| `process_link` | 通过 Jina Reader 抓取 URL → 结构化 Markdown（可选 JSON） |
| `process_note` | 纯文本 → 结构化 Markdown |
| `detect_intent` | 关键词识别意图 → todo/research/record |
| `list_inbox` | 列出 `~/ai-inbox/` 下的所有文件 |
| `get_config` | 获取当前合并后的配置（JSON） |
| `init_config` | 在 `~/.ai-inbox-mcp/config.json` 初始化默认配置 |
| `reload_config` | 热重载配置（编辑后无需重启） |

### 意图前缀约定

| 前缀 | 含义 | 输出 |
|------|------|------|
| `todo ` | 待办事项 | 合并到 `todo-YYYY-MM.md` |
| `研究 ` | 研究项 | 独立文件，type=concept |
| `记录 ` | 普通记录 | 独立文件，type=note |
| URL | 链接 | 通过 Jina Reader 抓取 |
| 无前缀 | 默认记录 | 独立文件 |

### 配置系统

配置文件路径优先级（高→低）：
1. `AI_INBOX_CONFIG` 环境变量（绝对路径）
2. `./ai-inbox-mcp.config.json`（项目目录）
3. `~/.ai-inbox-mcp/config.json`（用户 home）
4. 内置默认值

关键词完全由配置驱动，修改 `config.json` 后调用 `reload_config` 即可生效，无需重启服务。

### Jina Reader 回退

Jina Reader 超时（30s）时自动降级为直接 curl 抓取 HTML + 正则提取文章内容。

### 安装与启动

```bash
cd ~/ai-inbox-mcp
npm install
npm run build

# MCP 模式（stdio，Hermes 通过此方式调用）
npm run mcp

# HTTP webhook 服务器（可选）
npm run server
```

### 注册为 MCP Server

在 `~/.claude/settings.json`（或 Claude Desktop 配置）中注册：

```json
"mcpServers": {
  "ai-inbox": {
    "command": "node",
    "args": ["/Users/zhuoming/ai-inbox-mcp/dist/index.js"]
  }
}
```

### 代理配置

如果 Jina Reader 无法访问，在启动 MCP 服务前设置代理：

```bash
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890
cd ~/ai-inbox-mcp && npm run mcp
```

---

## 规划中：AI-inbox 桌面应用

**设计稿：** Figma（节点 2013-294）

### 界面布局（1920×1780）

```
┌─────────────────────────────────────────────────────────┐
│ NAV: [搜索框]  Write  Read          🔔12   Ai-InboX    │
├───────────────────────────────┬───────────────────────┤
│                               │  日历（april 10, 2021）│
│  左主区（瀑布流卡片）          │  [日 一 二 三 四 五 六]│
│                               │    30  31   1  2  3  4 │
│  今天                          │  ─────────────────────│
│  ┌─────┐ ┌───────┐ ┌─────┐   │                       │
│  │Card │ │ Card  │ │Card │   │  待办列表              │
│  └─────┘ └───────┘ └─────┘   │  ┌─────────────────┐  │
│                               │  │ ☐ Drink water   │  │
│  昨天                         │  │ ☐ Meditate      │  │
│  ┌───────┐ ┌─────┐           │  │ ☐ Read book     │  │
│  │ Card  │ │Card │           │  │ ☐ Walk 30min    │  │
│  └───────┘ └─────┘           │  └─────────────────┘  │
│                               │                       │
└───────────────────────────────┴───────────────────────┘
```

### 左主区（核心工作区）

- **顶部：** 输入框（快捷添加信息，placeholder: "Search Project ..."）
- **瀑布流：** 按天分组（今天 / 昨天 / MMdd）
- **右侧：** 可折叠预览面板，宽度可拖拽

### 右预览面板

- 日历组件（选日期筛选卡片）
- 待办列表（固定 4 条示例）
- 卡片详情（点击左区卡片后展开）

### 卡片类型与配色

| 类型 | 配色 | 说明 |
|------|------|------|
| todo | #097FE8（蓝） | 待办事项 |
| 待阅读 | #1AAE39（绿） | 待阅读内容 |
| note | #FABB18（黄） | 笔记 |
| source | #DADADA（灰） | 素材 |
| article | #9F9F9F（深灰） | 文章 |
| image | #3C9BE0（青） | 图片 |

### 卡片结构

```
┌────────────────────────────┐
│ ▌ 标题                     │
│   内容预览文字...           │
│   [Ready] [Working]       │
│   2025-04-10 14:32         │
└────────────────────────────┘
```

- 左侧 3px 色条表示类型
- 标题（Source Code Pro 500 18px）
- 内容预览（Source Code Pro 400 14px，灰色）
- 状态标签（圆角胶囊，可多选）
- 日期时间

### 顶部导航

| 元素 | 样式 |
|------|------|
| 搜索框 | 圆角 18px，半透明白底 |
| Write / Read | Acme 28px，点击切换模式 |
| 通知铃铛 | 圆形背景 + 红点计数（12） |
| Ai-InboX 标题 | Acme 36px |

### 日历组件

- 顶部：月份标题 + "today" 按钮
- 7列网格：Sun-Sat
- 当天高亮：黄色文字 + 黄色日期数字
- 非当月日期：30% 透明度

---

## 数据存储

### ai-inbox 临时文件夹

**路径：** `~/ai-inbox/`

用户审阅前，信息临时存放在此。文件格式为 Markdown，可选附带 `.json`（包含 AI 分析结果）。

### Obsidian 知识库

**路径：** `~/lzm/llm-wiki/MyNote/`

长期存储位置。用户从 inbox 审完后手动迁移，或由 AI 辅助归类。

#### frontmatter 规范

```yaml
---
type: concept | entity | source | question | comparison | synthesis
title: 标题
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [tag1, tag2]
status: active | archived
author: zhuoming
related: [[相关笔记]]
sources: [url1, url2]
---
```

#### 笔记风格

- 标题 + 要点 + 原文链接 + 来源
- Obsidian 双向链接友好

---

## 技术栈（规划）

| 层级 | 技术选型 |
|------|----------|
| 桌面框架 | Electron 或 Tauri |
| 前端 | React + TypeScript |
| 状态管理 | Zustand |
| UI 组件 | Radix UI / shadcn/ui |
| 样式 | Tailwind CSS |
| 本地存储 | SQLite 或 IndexedDB |
| 知识库同步 | Obsidian Vault API |

---

## 开发计划

### Phase 1 ✅ 已完成
- [x] ai-inbox MCP Server 实现
- [x] 9个 MCP 工具
- [x] 配置热重载
- [x] Jina Reader + HTML 降级抓取
- [x] 注册到 Hermes/Claude Desktop

### Phase 2 🔄 进行中
- [x] Figma 设计稿 Review
- [ ] 桌面应用技术选型确认
- [ ] 搭建 Electron/Tauri 项目骨架
- [ ] 实现瀑布流卡片布局
- [ ] 实现日历组件
- [ ] 连接 MCP 服务，读取 ~/ai-inbox/
- [ ] 右预览面板交互

### Phase 3 📋 待规划
- [ ] 飞书机器人接入桌面应用
- [ ] 知识库自动同步
- [ ] 多端同步（桌面 + 移动）
