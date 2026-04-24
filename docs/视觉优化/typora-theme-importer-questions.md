# Typora 主题导入器 — 待确认问题

## 1. 技术方案

### 1.1 PostCSS 依赖

转换器需要用 PostCSS 解析 CSS。当前项目 package.json 中没有 postcss 依赖。

**选项 A**：新增 `postcss` 明确依赖
**选项 B**：复用 vite 内置的 postcss（Vite 项目通常已安装 postcss 和 autoprefixer，可通过 `import postcss from 'postcss'` 使用）

**建议选 B**，因为 Vite 项目依赖树中通常已有 postcss，不需要额外加包。

**你倾向 A 还是 B？**

---

### 1.2 导入主题的持久化方式

Typora CSS 文件导入后保存在 `~/ai-inbox/themes/<id>/theme.css`。

**需要确认**：
- 主题元数据（`theme.json`）中 `id` 字段如何生成？
  - 选项 A：用 `typora-` 前缀 + 原主题名（如 `typora-vue`） sanitized
  - 选项 B：用户输入名称 + 自动生成 slug
- 如果同名主题已存在，如何处理？
  - 选项 A：覆盖
  - 选项 B：追加数字后缀（如 `typora-vue-2`）

---

### 1.3 设置页 UI

任务文档描述在设置页「外观」tab 增加：

1. "导入 Typora 主题 CSS" 按钮
2. 导入后展示主题名称列表
3. 选择导入主题作为正文主题（替换现有的 3 个内置选项）
4. 显示转换 warnings

**确认**：
- 导入主题列表是否放在「正文排版」下拉框旁边？
- 是否需要展示每个导入主题的 `isDark` 标识？
- 是否需要删除已导入主题的入口？

---

### 1.4 预览样本文档

任务 15 要求新增 `docs/视觉优化/typora-theme-preview-sample.md`，包含各类 Markdown 元素。

**确认**：这个文件是否在第一版实现时就创建，还是在「第五阶段 预览与验证」再做？

---

## 2. 范围确认

### 2.1 第一版边界（只需确认是否正确）

1. **支持的文件格式**：仅 `.css` 文件（不支持 `.zip` 主题包）
2. **不支持的功能**：远程下载字体、在线主题市场、完整 Typora source mode 样式
3. **警告内容**：转换过程中丢弃的规则写入 warnings，包括：
   - 被丢弃的选择器（如 `.sidebar`、`html`、`body`）
   - 被丢弃的 `@import`
   - 被丢弃的远程 URL 资源（字体、图片）
   - 被丢弃的 `position: fixed`/`z-index`/`overflow` 等非正文必要规则

**以上边界是否准确？**

---

## 3. 实施顺序

### 3.1 开发顺序建议

```
第一阶段（调研）
  → 任务 1-2：选择 4 个主题样本、记录选择器

第二阶段（核心转换器）
  → 任务 3-5：定义文件结构、输出格式、token 映射表
  → 任务 6-10：实现 typora-theme-converter.ts

第三阶段（Electron IPC）
  → 任务 11：新增 4 个 theme:* IPC handlers

第四阶段（Renderer 集成）
  → 任务 12：动态加载导入主题
  → 任务 13：设置页 UI
  → 任务 14：ArticleBodyEditor 接入

第五阶段（验证）
  → 任务 15-16：预览样本文档 + 质量验收
```

**这个顺序是否OK？或者你有其他优先级调整？**
