# 编辑器 UI 修复 — 执行记录

## 用途

本文件记录 4 个 UI 修复任务的执行结果。后续执行者以本文件为准。

---

## 执行摘要

| 任务 | 状态 | 类型 |
|------|------|------|
| 滚动区域修复 | ✅ 已完成 | 布局修复 |
| Bubble Menu 修复 | ✅ 已完成 | 功能修复 + 样式修复 |
| frontmatter Panel 浮空化 | ✅ 已完成 | 布局修复 |
| Slash 菜单白底与精简 | ✅ 已完成 | 样式修复 |

---

## 任务 1：滚动区域修复

### 问题
导航栏随正文滚动，应固定。

### 修复
`ArticlePage.vue` 的 `.article-page` 加 `overflow: hidden`，使页面容器固定视觉高度（`100vh`），滚动完全由 `.rich-editor__content`（`overflow-y: auto`）承担。

**修改文件：**
- `src/pages/ArticlePage.vue`

### 验收结果
1. 导航栏固定 ✓
2. 正文区独立滚动 ✓
3. frontmatter 展开/收起时滚动行为稳定 ✓

---

## 任务 2：Bubble Menu 修复

### 问题
白底需要、按钮点击无效（事件冒泡导致 blur 先于 click 完成）。

### 修复
1. `RichEditorToolbar.vue`：`@click` → `@click.stop`，阻止事件冒泡
2. `RichEditorBubbleMenu.vue`：wrapper 加 `rich-editor__bubble-menu--white` class
3. `editor.css`：新样式 `.rich-editor__bubble-menu--white` 白底 + 细阴影；`.rich-editor__bubble-menu` 本身背景透明、按钮用深色文字；暗色模式兼容

**修改文件：**
- `src/modules/rich-editor/components/RichEditorToolbar.vue`
- `src/modules/rich-editor/components/RichEditorBubbleMenu.vue`
- `src/modules/rich-editor/styles/editor.css`

### 验收结果
1. Bubble Menu 白底显示 ✓
2. Bold / Italic / Underline / Strike / Code 按钮可点击 ✓
3. Link 按钮可打开 Link Popover ✓

---

## 任务 3：Frontmatter Panel 浮空化

### 问题
`editor-surface` 有 `padding-right: min(360px, 32vw)` 挤压编辑区，frontmatter panel 参与布局流。

### 修复
移除 `.editor-workspace[data-frontmatter-open='true'] .editor-surface` 的 `padding-right` 规则。frontmatter panel 本身已是 `position: absolute`，浮空在编辑器上层，不影响布局流。

**修改文件：**
- `src/pages/ArticlePage.vue`

### 验收结果
1. frontmatter panel 展开时覆盖在编辑区上层，不挤压 ✓
2. 收起后无布局空洞 ✓
3. 正文滚动行为保持正常 ✓

---

## 任务 4：Slash 菜单白底与精简

### 问题
深色背景，内容冗余（group label + description），应精简为 icon + 简短标题。

### 修复
1. `RichEditorSuggestionMenu.vue`：移除 group label 渲染，移除 description，只保留单层列表
2. `editor.css`：
   - `.rich-editor__suggestion-menu` 改白底（`#ffffff`）
   - 宽度从 `280px` 缩窄到 `240px`
   - 移除 `.rich-editor__suggestion-group`、`.rich-editor__suggestion-group-label`、`.rich-editor__suggestion-item-description` 相关样式
   - 添加 `.rich-editor__suggestion-empty` 空状态样式
   - 暗色模式下 suggestion menu 保持白色

**修改文件：**
- `src/modules/rich-editor/components/RichEditorSuggestionMenu.vue`
- `src/modules/rich-editor/styles/editor.css`

### 验收结果
1. slash 菜单白底显示 ✓
2. 每行只有 icon + 简短标题 ✓
3. hover / selected 状态清晰可见 ✓
4. 点击和 Enter 执行不受影响 ✓

---

## 验证结果

```bash
$ npm run typecheck
> ai-inbox@1.0.0 typecheck
> vue-tsc --noEmit
# 无报错

$ npm run build
# 成功，exit code 0
```

---

## 已完成的约束（不变）

- `table` UI 入口不暴露
- 不重新引入 `Nuxt UI`
- 宿主层保持薄，不介入编辑器内部样式
- 编辑器核心功能边界：heading / bold / italic / underline / strike / code / bullet list / ordered list / task list / blockquote / code block / horizontal rule / link / image / undo / redo / slash menu

---

## Review 检查项

1. Bubble Menu 按钮是否真的触发动作 ✓
2. 是否真的只有正文区滚动 ✓
3. `frontmatter-panel` 是否真的脱离布局流 ✓
4. slash 菜单是否精简成 `icon + 标题` ✓
5. 是否重新引入了 `table` — 否 ✓
6. 是否重新让宿主页面介入编辑器内部样式 — 否 ✓
