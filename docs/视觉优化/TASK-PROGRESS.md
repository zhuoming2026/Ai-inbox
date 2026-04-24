# Typora 导入主题统一主题模型 — 任务进度书

## 基本信息

- **任务来源**：`typora-theme-package-single-theme-task.md`
- **分支**：`codex/homepage-design-pass`
- **提交**：`c89952e5`
- **状态**：主体完成，待 Task 13（内置主题 CSS 入口补全）

---

## 任务目标

把分散的 `data-app-theme` / `data-typography-theme` / `data-code-theme` 三套主题系统统一为单一 `[data-ai-theme='<id>']` 模型。用户心智简化为：选一个 Typora CSS → 生成一个 ai-inbox 主题 → 启用。

---

## 完成情况

| 任务 | 内容 | 状态 |
|------|------|------|
| Task 1 | 共享类型 `imported-theme.ts` 改造 | ✅ |
| Task 2-4 | Converter 输出 `[data-ai-theme]` 单一入口 | ✅ |
| Task 5 | Electron IPC 拆分为 `preview` + `save` 两步 | ✅ |
| Task 6-7 | Settings 新增 `activeThemeId` + 统一注入 `useImportedThemes` | ✅ |
| Task 8-10 | SettingsPage.vue UI 改造（单下拉 + 导入弹窗 + 主题列表） | ✅ |
| Task 11-13 | ArticlePage toolbar 接入整体主题（Task 13 未完成） | ⚠️ |
| Task 14 | 验证脚本更新为 `[data-ai-theme]` 断言 | ✅ |
| Task 15 | `useImportedThemes` composable 实现 | ✅ |
| Task 16 | `browser-electron-api.ts` dev-mode stub 更新 | ✅ |
| Task 17 | `env.d.ts` 类型更新 | ✅ |

---

## 各模块改动详情

### 1. `src/shared/imported-theme.ts`（新建）
- 定义 `ImportedThemeMetadata` / `TyporaThemeImportDraft` / `ImportedThemeRecord` 接口
- 不再暴露 `supportsTypography` / `supportsAppShell` / `applyTo*` 字段
- 新增 `assets: { fontsDir, imagesDir }`

### 2. `src/shared/typora-theme-converter.ts`（新建）
- PostCSS AST 解析 Typora CSS，不使用正则
- 输出全部使用 `[data-ai-theme='<id>']` 前缀
- `.tiptap` 和 `.rich-editor__content` 双重 scope
- `mapSelector` 拆分逗号分隔的复合 selector，逐个映射

### 3. `electron/main.ts`
- 废弃 `theme:import-typora`，替换为 `theme:preview-typora` + `theme:save-imported`
- `preview`：打开文件选择器 → 读取 CSS → converter → 返回 draft（不写磁盘）
- `save`：生成 slug（解决冲突）→ 替换 CSS 中的旧 id → 写 `theme.json` + `theme.css` + `assets/fonts/` + `assets/images/`
- `theme:read` / `theme:delete` / `theme:list-imported` 三个基础 IPC

### 4. `electron/preload.ts`
- `theme.previewTypora()` / `theme.saveImported(data)` / `theme.listImported()` / `theme.read(id)` / `theme.delete(id)`

### 5. `src/composables/useImportedThemes.ts`（新建）
- `injectThemeCss` / `removeInjectedCss` 操作 `[data-ai-theme]` 属性
- `activateTheme(id)` 直接调用 `theme.read(id)` 不依赖列表状态
- `watch` 监听 `window.electronAPI` 变化时自动 `loadThemes()`

### 6. `src/pages/SettingsPage.vue`
- **模板**：正文排版 + 正文代码样式两个下拉 → 合并为单一"当前主题"下拉
- **模板**：新增导入按钮 → `previewTypora` → 确认弹窗（修改名 / 仅导入 / 导入并启用）
- **模板**：导入主题列表（含深色标识 + 删除按钮）
- **逻辑**：`onActiveThemeChange` / `handleImportTypora` / `confirmImport` / `cancelImport` / `handleDeleteTheme`
- **数据**：`activeThemeId` 字段读写、`currentThemeOptions` computed（内置 + 导入）

### 7. `src/pages/ArticlePage.vue`
- Toolbar 两下拉（正文 + 代码）→ 单一"主题"下拉
- `editorTypographyTheme ref` → `activeThemeId ref`
- `typographyThemeOptions` → `themeOptions`
- `onTypographyThemeChange` → `onThemeChange`
- `loadEditorAppearanceSettings` 从 `settings?.activeThemeId` 读取

### 8. `scripts/test-typora-theme-converter.mjs`（新建）
- 5 个测试用例覆盖复合 selector / 根容器 / `.md-fences` / blockquote / `.task-list`
- 所有断言改为 `[data-ai-theme]` 前缀
- 新增 `mustNotContain` 检查旧前缀（`data-app-theme` / `data-typography-theme` / `data-code-theme`）

---

## 未完成事项

### Task 13：内置主题补 `[data-ai-theme]` 入口

内置主题文件（`typora-github` / `default` / `serif`）的 CSS 需要补一条：

```css
[data-ai-theme='typora-github'] {
  /* 复用现有 --* 变量 */
}
```

这样内置主题也能通过 `[data-ai-theme]` 生效。目前内置主题仍使用旧的 `[data-typography-theme]` 选择器，仅影响内置主题用户。导入主题已全部使用新选择器，不受影响。

---

## 验证结果

| 命令 | 结果 |
|------|------|
| `node scripts/test-typora-theme-converter.mjs` | ✅ 5/5 测试通过 |
| `npx vue-tsc --noEmit` | ✅ 无错误 |
| `npm run build` | ✅ 构建成功 |

---

## 遇到的困难

### 1. Vue SFC 嵌套 `<template>` 标签解析歧义

**现象**：SettingsPage.vue 在加入导入弹窗 HTML 后构建报错 `Element is missing end tag` at line 680。

**原因**：Vue SFC 解析器将内层 `<template v-if="...">` 的 `</template>` 误识别为整个文件的结束标签，导致后续内容被当作孤立标签。

**处理**：将导入弹窗的 `v-if` 条件从嵌套 `<template>` 标签改为绑定在 `<div>` 元素上，避免使用 `<template>` 语法。

### 2. 导入主题 ID 持久化问题

**现象**：导入主题后 slug 基于临时文件名生成，用户改名后 slug 不变，导致 `activateTheme` 读取不到正确 id。

**处理**：在 `confirmImport` 中用 `result.metadata.id`（来自 `theme:save-imported` 返回值）设置 `activeThemeId`，而不是 `importDraft.value.id`。

### 3. Converter 复合 selector 污染全局 `.tiptap`

**现象**：Typora CSS 中 `.tiptap` 类被无条件添加到所有选择器，导致 `.tiptap` 以外的 DOM（如页面正文）也被意外匹配。

**处理**：修改 `mapSelector` 逻辑，先用逗号拆分复合 selector，再对每个部分单独判断是否需要追加 `.tiptap` scope。根级 `#write` 映射为 `[data-ai-theme] .tiptap` / `[data-ai-theme] .rich-editor__content`，而内层选择器（`h1` / `p` 等）才加 scope。
