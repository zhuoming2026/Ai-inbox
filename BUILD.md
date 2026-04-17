# AI-inbox 构建与打包指南

## 环境要求

| 工具 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | >= 18 | 建议使用 LTS 版本 |
| npm | >= 9 | 随 Node.js 一起安装 |
| Xcode | >= 15 | 仅 macOS 打包需要 |
| electron-builder | ^24.13.0 | 已作为 devDependencies 集成 |

## 一、安装依赖

```bash
cd ai-inbox-app
npm install
```

> 首次 clone 项目后必须执行，安装 package.json 中声明的所有依赖。

## 二、开发模式

```bash
npm run dev
```

- 启动 Vite dev server（热重载）
- 同时启动 Electron 窗口
- renderer 和 main process 均支持热更新

## 三、生产构建

```bash
npm run build
```

该命令会依次执行：

1. `vue-tsc --noEmit` — TypeScript 类型检查
2. `vite build` — 打包 Vue 前端到 `dist/`
3. `electron-builder` — 打包为可执行程序

构建产物输出到 `release/` 目录。

## 四、打包应用

### 打包为目录（不生成安装包）

```bash
npm run pack
```

输出到 `release/` 下，适合快速验证打包结果。

### 打包为 macOS 安装包

```bash
npm run pack:mac
```

生成两个目标格式：

| 格式 | 文件位置 | 说明 |
|------|---------|------|
| DMG | `release/*.dmg` | 磁盘镜像，可分发给用户 |
| ZIP | `release/*.zip` | 压缩包 |

### 打包为 Windows 安装包

```bash
npm run pack:win
```

## 五、打包配置说明

配置文件：`electron-builder.yml`

```yaml
appId: com.aiinbox.app
productName: AI-inbox
directories:
  output: release
  buildResources: resources
files:
  - dist/**/*        # Vite 构建产物
  - dist-electron/**/*  # Electron main/preload 构建产物
  - resources/**/*
extraResources:
  - from: resources/
    to: ./
mac:
  category: public.app-category.productivity
  target:
    - dmg
    - zip
```

如需调整包名、App ID、签名证书等，修改此文件。

## 六、常见问题

### electron-builder 签名问题

macOS 打包时若出现签名错误，检查：

1. 是否在 Xcode 中配置了有效的证书（Development 或 Distribution）
2. `electron-builder.yml` 中是否指定了 `sign` 配置

### Node 版本不兼容

Electron 30 需要 Node >= 18。使用 nvm 管理多版本：

```bash
nvm use 18
npm install
npm run pack:mac
```

### 构建产物路径问题

- `dist/` — 前端构建产物（Vite 输出）
- `dist-electron/` — Electron main/preload 构建产物（vite-plugin-electron 输出）
- `release/` — electron-builder 最终打包产物

## 七、快速参考

| 操作 | 命令 |
|------|------|
| 安装依赖 | `npm install` |
| 开发调试 | `npm run dev` |
| 生产构建 | `npm run build` |
| 打包目录 | `npm run pack` |
| 打包 Mac | `npm run pack:mac` |
| 打包 Windows | `npm run pack:win` |
| 类型检查 | `npm run typecheck` |
