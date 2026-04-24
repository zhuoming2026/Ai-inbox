# Typora 主题导入器 Review 修复任务单

## 目标

修复 Typora 主题导入器当前验收中发现的 4 个问题。本文档是执行指令，不是讨论稿。实现时必须按本文档指定方案修改。

涉及文件：

```txt
src/shared/typora-theme-converter.ts
src/composables/useImportedThemes.ts
src/pages/ArticlePage.vue
src/pages/SettingsPage.vue
```

完成后必须运行：

```bash
npm run typecheck
npm run build
```

同时必须增加或执行一个 converter 行为验证，证明 `#write h1` 不再污染 `.tiptap` 根容器。

## 修复 1：重写 Typora selector mapper

### 问题

当前 `mapSelector()` 通过字符串替换 `#write`：

```ts
.replace(/#write\b/g, `[data-typography-theme='${themeId}'] .tiptap, [data-typography-theme='${themeId}'] .rich-editor__content`)
```

这会把：

```css
#write h1 { color: red; }
```

错误转换成：

```css
[data-typography-theme='id'] .tiptap,
[data-typography-theme='id'] .rich-editor__content h1 {
  color: red;
}
```

第一段 `.tiptap` 会把 h1 的样式应用到整个正文容器，污染所有内容。

### 指定方案

必须重写 `mapSelector(selector, themeId)`，不要继续对完整 selector 做简单 `.replace(/#write\b/g, ...)`。

实现步骤：

1. 先按逗号拆分 selector list。
2. 对每一个 selector 单独 trim。
3. 针对每一个单独 selector 做映射。
4. 单个 selector 映射成功后，必须输出两条 scoped selector：

```txt
[data-typography-theme='<id>'] .tiptap<suffix>
[data-typography-theme='<id>'] .rich-editor__content<suffix>
```

5. 最后把所有映射成功的 selector 用 `, ` 合并。
6. 如果一个 selector 无法映射，忽略该 selector，并记录 warning。
7. 如果整个 selector list 都无法映射，返回 `null`。

### 必须支持的映射

输入：

```css
#write { ... }
```

输出：

```css
[data-typography-theme='<id>'] .tiptap,
[data-typography-theme='<id>'] .rich-editor__content {
  ...
}
```

输入：

```css
#write h1 { ... }
```

输出：

```css
[data-typography-theme='<id>'] .tiptap h1,
[data-typography-theme='<id>'] .rich-editor__content h1 {
  ...
}
```

输入：

```css
#write blockquote p { ... }
```

输出：

```css
[data-typography-theme='<id>'] .tiptap blockquote p,
[data-typography-theme='<id>'] .rich-editor__content blockquote p {
  ...
}
```

输入：

```css
.md-fences { ... }
```

输出：

```css
[data-typography-theme='<id>'] .tiptap pre,
[data-typography-theme='<id>'] .rich-editor__content pre {
  ...
}
```

输入：

```css
.md-fences code { ... }
```

输出：

```css
[data-typography-theme='<id>'] .tiptap pre code,
[data-typography-theme='<id>'] .rich-editor__content pre code {
  ...
}
```

输入：

```css
.task-list { ... }
```

输出：

```css
[data-typography-theme='<id>'] .tiptap ul[data-type="taskList"],
[data-typography-theme='<id>'] .rich-editor__content ul[data-type="taskList"] {
  ...
}
```

### 必须新增的验证

新增或补充 converter 验证脚本，至少断言：

```css
#write h1 { color: red; }
#write p { color: blue; }
```

转换结果必须包含：

```css
[data-typography-theme='typora-sample'] .tiptap h1
[data-typography-theme='typora-sample'] .rich-editor__content h1
[data-typography-theme='typora-sample'] .tiptap p
[data-typography-theme='typora-sample'] .rich-editor__content p
```

转换结果不能包含：

```css
[data-typography-theme='typora-sample'] .tiptap,
[data-typography-theme='typora-sample'] .rich-editor__content h1
```

也不能包含：

```css
[data-typography-theme='typora-sample'] .tiptap,
[data-typography-theme='typora-sample'] .rich-editor__content p
```

## 修复 2：消除导入主题激活竞态

### 问题

当前 `activateTheme(id)` 先检查：

```ts
const theme = importedThemes.value.find((t) => t.id === id)
if (!theme) return false
```

ArticlePage 初始化时，`loadEditorAppearanceSettings()` 可能先于 `loadThemes()` 完成。此时本地确实存在主题文件，但 `importedThemes` 还没加载完，`activateTheme()` 会直接返回 false，导致错误 fallback 到 `typora-github`。

### 指定方案

必须修改 `activateTheme(id)`：

1. 不允许依赖 `importedThemes.value.find(...)` 作为激活前置条件。
2. 必须直接调用：

```ts
window.electronAPI?.theme.read(id)
```

3. 只要 `theme.read(id)` 返回 `{ metadata, css }`，就注入 CSS 并返回 `true`。
4. 如果 read 失败，再返回 `false`。
5. 如果 read 成功但 `importedThemes` 列表中没有这个 metadata，则把 metadata 合并进 `importedThemes.value`。

指定实现形态：

```ts
async function activateTheme(id: string) {
  const data = await window.electronAPI?.theme.read(id)
  if (!data?.css || !data.metadata) return false

  injectThemeCss(id, data.css)

  if (!importedThemes.value.some((theme) => theme.id === id)) {
    importedThemes.value = [...importedThemes.value, data.metadata]
  }

  return true
}
```

## 修复 3：失败 fallback 后不能持久化坏 id

### 问题

当前 `onTypographyThemeChange()` 中，如果导入主题激活失败，UI fallback 到 `typora-github`，但最后仍然执行：

```ts
await persistEditorAppearanceSettings({ editorTypographyTheme: value })
```

这会把失败的导入主题 id 写回 settings，下次打开继续失败。

### 指定方案

必须修改 `onTypographyThemeChange()`：

1. 先定义：

```ts
let nextTheme: TypographyTheme = value
```

2. 如果内置主题，`nextTheme = value`。
3. 如果导入主题激活成功，`nextTheme = value`。
4. 如果导入主题激活失败：

```ts
deactivateTheme()
nextTheme = 'typora-github'
message.warning('导入主题不可用，已切回 Typora GitHub')
```

5. 最终必须：

```ts
editorTypographyTheme.value = nextTheme
await persistEditorAppearanceSettings({ editorTypographyTheme: nextTheme })
```

不允许继续持久化原始失败的 `value`。

## 修复 4：导入主题列表必须都能删除

### 问题

当前 SettingsPage 里删除按钮只有当前选中的导入主题才显示：

```vue
v-if="settings.editorTypographyTheme === theme.id"
```

这导致用户无法删除未使用的导入主题。

### 指定方案

必须移除这个 `v-if`。

删除按钮对所有导入主题都显示。

删除行为保持：

1. 如果删除的是当前正在使用的主题：
   - 先 `deactivateTheme()`
   - `settings.editorTypographyTheme = 'typora-github'`
   - 保存 settings
2. 如果删除的不是当前主题：
   - 直接删除
   - 不改当前 settings
3. 删除完成后刷新列表。

如果当前 `handleDeleteTheme(id)` 已经包含第 1 点逻辑，只需要保证按钮始终显示，并确认删除后调用了 `deleteTheme(id)`。

## 补充要求：不要扩大范围

本次只修以上 4 个问题。

不要在本次修复中重构：

1. Electron theme IPC 结构。
2. SettingsPage 整体外观。
3. ArticlePage 编辑器保存逻辑。
4. Typora converter 的完整选择器覆盖范围。
5. 主题市场、远程下载、zip 导入等功能。

## 验收命令

必须运行：

```bash
npm run typecheck
npm run build
```

如果新增脚本为：

```txt
scripts/test-typora-theme-converter.mjs
```

则必须运行：

```bash
node scripts/test-typora-theme-converter.mjs
```

## 最终验收标准

1. `#write h1` 转换后不会生成裸 `.tiptap` selector。
2. `#write p` 转换后不会生成裸 `.tiptap` selector。
3. ArticlePage 打开时，即使 imported theme list 还没加载完成，也能通过 `theme.read(id)` 激活已保存的导入主题。
4. 导入主题激活失败时，settings 最终保存为 `typora-github`，不是失败 id。
5. SettingsPage 中每个导入主题都显示删除按钮。
6. 删除当前主题会 fallback 到 `typora-github`。
7. 删除非当前主题不会改变当前主题设置。
8. `npm run typecheck` 通过。
9. `npm run build` 通过。
