# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 开发授权

**本项目授权范围：**

- **代码编写**：直接创建、修改、删除源码文件（TypeScript/Vue/CSS/HTML/JSON 等）
- **依赖安装**：执行 `npm install`、`npm uninstall` 等命令安装包
- **构建运行**：执行 `npm run dev`、`npm run build`、`npm run` 等项目脚本
- **Git 操作**：创建分支、提交（`git commit`）、推送（`git push`）、查看历史
- **Electron 打包**：执行 electron-builder 打包命令
- **测试**：运行测试、查看测试结果
- **文件管理**：创建必要的目录结构、配置文件、静态资源

**授权原则：**
- 所有改动在 `ai-inbox-app/` 目录内，不超出项目根目录
- 涉及破坏性操作（删除大量文件、重写历史等）前先说明
- 不在项目内存储密钥、凭据等敏感信息（使用环境变量或 electron-store）
- 遵循 Vue 3 + TypeScript + Vite + Electron 技术栈
- 参考 `SPEC.md` 实现功能，不偏离设计规格

---

## 项目概述

**项目：** AI-inbox 桌面应用（Electron + Vue 3）

**目标：** 打造私人信息收件箱，内置 MCP 服务端，用户输入信息 → AI 预处理 → 存入 inbox → 审阅归档。

**技术栈：**
- 桌面框架：Electron
- 前端：Vue 3 + Vite + TypeScript
- 状态管理：Pinia
- 构建工具：electron-builder
- 内置 MCP 服务端（双传输：stdio 子进程 + HTTP Server）

**设计规格：** `SPEC.md`

---

## 项目结构（规划）

```
ai-inbox-app/
├── electron/               # Electron main process
│   ├── main.ts            # Electron 主进程入口
│   ├── preload.ts         # preload script（IPC bridge）
│   ├── mcp/               # MCP 服务端代码
│   │   ├── index.ts       # MCP 入口
│   │   └── tools/         # 9 个 MCP 工具
│   ├── services/          # main process 服务
│   │   ├── file-watcher.ts    # chokidar 文件监听
│   │   ├── settings-store.ts   # electron-store 配置
│   │   └── mcp-http-server.ts  # MCP HTTP 端点
│   └── ipc/               # IPC handlers
│       └── handlers.ts     # 文件读写、状态更新等 IPC 处理
├── src/                   # Vue renderer process
│   ├── main.ts            # Vue 入口
│   ├── App.vue
│   ├── router/            # vue-router 路由
│   │   └── index.ts
│   ├── views/             # 页面
│   │   ├── Home.vue       # 首页（输入区 + 瀑布流卡片 + 右侧面板）
│   │   ├── Article.vue    # 文件编辑/阅读页
│   │   └── Settings.vue   # 设置页
│   ├── components/        # 通用组件
│   │   ├── Card.vue       # 卡片
│   │   ├── Calendar.vue   # 日历
│   │   ├── InputArea.vue  # 输入区
│   │   └── StatusTag.vue # 状态标签
│   ├── stores/            # Pinia stores
│   │   ├── inbox.ts       # inbox 文件列表
│   │   └── settings.ts    # 设置
│   ├── styles/            # 样式
│   │   └── variables.css  # CSS 变量（主题）
│   └── utils/             # 工具函数
├── resources/             # 打包资源
│   └── mcp-child.js       # MCP 子进程入口（打包后）
├── package.json
├── vite.config.ts
├── electron-builder.yml
├── tsconfig.json
└── SPEC.md                # 设计规格书
```

---

## 命令

```bash
# 安装依赖
npm install

# 开发模式（Vite dev server + Electron）
npm run dev

# 生产构建
npm run build

# 打包 Mac app
npm run pack
npm run pack:mac   # macOS
npm run pack:win   # Windows

# 测试
npm run test

# MCP 服务（stdio 模式，供 AI 客户端连接）
npm run mcp
```

---

## 设计稿

**Figma 文件：** https://www.figma.com/design/aiEpfdX3SRFIbCJiD1KxNw/AI-inbox

**节点：**
- 首页：`2013-294`
- 编辑页：`2024-2246`
- 设置页：暂无设计稿，按功能需求实现

**读取方式：** `mcporter call figma-developer-mcp.get_figma_data fileKey="aiEpfdX3SRFIbCJiD1KxNw" nodeId="<NODE_ID>"`

---

## 关键实现细节

### 文件操作（main process fs API）
- 所有文件读写通过 Electron main process，不在 renderer 直接操作 fs
- IPC channel：`inbox:list`、`inbox:read`、`inbox:write`、`inbox:update-status`、`inbox:archive`、`inbox:delete`
- chokidar 监听 `~/ai-inbox/` 目录，变化时通过 IPC 通知 renderer 刷新

### MCP 服务（内置于 app）
- **Stdio**：fork 子进程，path 指向 `resources/mcp-child.js`
- **HTTP**：`localhost:3100/mcp` 端点，main process 内置
- 工具集：process_todo / process_note / process_link / process_image / detect_intent / list_inbox / get_config / init_config / reload_config

### 主题系统
- 基于 CSS 变量（`--bg-primary`、`--text-primary` 等）
- 预设主题：浅色 / 深色 / 跟随系统
- `customConfig` 字段支持扩展（Phase 2.2）

### frontmatter 规范
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
