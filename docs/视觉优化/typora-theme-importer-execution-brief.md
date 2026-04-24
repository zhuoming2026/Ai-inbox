# Typora 主题导入器一次性执行任务单

## 执行目标

一次性实现 Typora CSS 导入与转换 MVP，用户可以在设置页选择一个 `.css` 文件，把它转换成 ai-inbox 可用的导入主题，并在文章页 / 设置页选择使用。

本任务单已经替待确认问题做出决策，执行过程中不要再因为这些问题中断：

1. PostCSS 依赖：优先复用依赖树中已有 `postcss`。如果 TypeScript 无法 import 或打包失败，再把 `postcss` 显式加入 `dependencies`。
2. 主题 id：使用 `typora-` + 文件名或主题名 slug。
3. 同名冲突：自动追加数字后缀，例如 `typora-vue-2`，不要覆盖。
4. 设置页 UI：放在“正文排版”相关区域，导入主题进入同一个正文主题下拉框。
5. 第一版需要删除入口：需要，支持删除导入主题。
6. 第一版需要显示 `isDark`：需要，但只作为小标签或辅助文案，不影响选择逻辑。
7. 第一版就创建预览样本文档。
8. 第一版只支持 `.css`，不支持 `.zip`、远程下载、在线主题市场、远程字体下载。

## 总体交付

完成后需要具备：

1. 一个结构化 Typora CSS 转换器。
2. Electron main process 文件导入、读取、列表、删除 IPC。
3. Renderer 动态加载导入主题 CSS。
4. 设置页导入、选择、删除、warnings 展示。
5. ArticlePage 工具栏正文主题下拉可显示并切换导入主题。
6. 导入主题能够作用于编辑器正文，并可选作用于应用外壳 token。
7. 不污染全局样式，切回内置主题后恢复正常。

## 相关现有文件

优先阅读这些文件，沿用现有模式：

```txt
electron/main.ts
electron/preload.ts
src/env.d.ts
src/lib/browser-electron-api.ts
src/pages/SettingsPage.vue
src/pages/ArticlePage.vue
src/components/ArticleBodyEditor.vue
src/modules/rich-editor/components/RichEditor.vue
src/modules/rich-editor/types/editor.ts
src/modules/rich-editor/styles/typography/base.css
src/modules/rich-editor/styles/typography/themes/default.css
src/modules/rich-editor/styles/typography/themes/serif.css
src/modules/rich-editor/styles/typography/themes/typora-github.css
src/composables/useTheme.ts
src/styles/theme.css
src/styles/themes/light.css
src/styles/themes/dark.css
public/themes/tokens.css
```

同时参考：

```txt
docs/视觉优化/editor-typora-theme-importer-task.md
docs/视觉优化/typora-theme-importer-questions.md
```

## 阶段 1：主题数据模型

### 任务 1：新增共享类型

建议新增：

```txt
src/shared/imported-theme.ts
```

定义：

```ts
export interface ImportedThemeMetadata {
  id: string
  name: string
  source: 'typora'
  sourceFileName: string
  sourceUrl?: string
  createdAt: string
  supportsTypography: boolean
  supportsAppShell: boolean
  isDark: boolean
  warnings: string[]
}

export interface ImportedThemeRecord {
  metadata: ImportedThemeMetadata
  css: string
}

export interface TyporaThemeImportResult {
  theme: ImportedThemeRecord
  warnings: string[]
}
```

如果项目已有更合适的 shared type 文件，可以合并，但不要把类型散落在页面组件里。

### 任务 2：主题 id 规则

实现 slug 工具：

1. 来源优先级：CSS 注释里的 `name` / 文件名去扩展名。
2. 转小写。
3. 非字母数字替换为 `-`。
4. 合并连续 `-`。
5. 去掉首尾 `-`。
6. 加 `typora-` 前缀。
7. 空值 fallback 为 `typora-imported-theme`。

同名冲突时：

```txt
typora-vue
typora-vue-2
typora-vue-3
```

不要覆盖已有主题。

## 阶段 2：Typora CSS 转换器

### 任务 3：新增转换模块

新增：

```txt
src/shared/typora-theme-converter.ts
```

导出：

```ts
export interface ConvertTyporaThemeInput {
  css: string
  fileName: string
  existingIds?: string[]
}

export interface ConvertTyporaThemeOutput {
  id: string
  name: string
  css: string
  metadata: ImportedThemeMetadata
  warnings: string[]
}

export function convertTyporaTheme(input: ConvertTyporaThemeInput): ConvertTyporaThemeOutput
```

### 任务 4：使用 PostCSS

执行策略：

1. 先尝试 `import postcss from 'postcss'`。
2. 如果 typecheck / build 无法解析，再执行 `npm install postcss` 并提交 `package.json`、`package-lock.json`。
3. 不要用正则解析完整 CSS。

可以用少量字符串处理做 metadata / slug，但 CSS rule 解析必须走 PostCSS AST。

### 任务 5：metadata 解析

支持从 CSS 顶部注释中读取常见字段：

```css
/*
name: Vue
author: ...
version: ...
*/
```

第一版只需要读取 `name`，读不到就用文件名。

### 任务 6：选择器映射

第一版必须支持：

```txt
#write                         -> .tiptap / .rich-editor__content
#write h1                      -> h1
#write h2                      -> h2
#write h3                      -> h3
#write h4                      -> h4
#write h5                      -> h5
#write h6                      -> h6
#write p                       -> p
#write a                       -> a
#write blockquote              -> blockquote
#write ul                      -> ul
#write ol                      -> ol
#write li                      -> li
#write table                   -> table
#write thead                   -> thead
#write tbody                   -> tbody
#write tr                      -> tr
#write th                      -> th
#write td                      -> td
#write img                     -> img
#write hr                      -> hr
#write pre                     -> pre
#write code                    -> code
#write pre code                -> pre code
.md-fences                     -> pre
.md-fences code                -> pre code
```

输出 selector 必须 scoped：

```css
[data-typography-theme='<id>'] .tiptap h1,
[data-typography-theme='<id>'] .rich-editor__content h1 {
  ...
}
```

`#write` 本体输出为：

```css
[data-typography-theme='<id>'] .tiptap,
[data-typography-theme='<id>'] .rich-editor__content {
  ...
}
```

### 任务 7：规则过滤

第一版丢弃这些 selector 或 at-rule，并写入 warnings：

```txt
html
body
:root
.sidebar
.outline-content
.file-node
.megamenu
.footer
.typora-export
.CodeMirror
.cm-s-inner
.md-meta
.md-line
.md-toc
```

丢弃：

1. `@import`
2. 包含远程 URL 的 `url(http...)` / `url(https...)`
3. 明显影响全局布局的声明：
   - `position: fixed`
   - `z-index`
   - `top`
   - `right`
   - `bottom`
   - `left`
4. `overflow` 仅在 `pre`、`table`、`.md-fences` 映射目标中允许，其他地方丢弃并 warning。

### 任务 8：token 提取

从转换后的规则和原始规则中提取 token 候选值。

优先级：

1. `#write` 上的 `background` / `background-color`
2. `#write` 上的 `color`
3. `#write` 上的 `font-family`
4. `#write h1/h2/h3` 上的 `color`
5. `#write a` 上的 `color`
6. `blockquote` border / background / color
7. `pre` / `.md-fences` background / color
8. `table` / `th` / `td` border-color

输出到：

```css
[data-typography-theme='<id>'] {
  --typography-font-body: ...;
  --typography-font-heading: ...;
  --typography-font-code: ...;
  --typography-text: ...;
  --typography-heading: ...;
  --typography-link: ...;
  --typography-blockquote-border: ...;
  --typography-blockquote-bg: ...;
  --typography-code-block-bg: ...;
  --typography-code-block-color: ...;
  --typography-table-border: ...;
}
```

同时输出应用外壳 token：

```css
[data-app-theme='<id>'] {
  --bg-primary: ...;
  --bg-secondary: ...;
  --bg-card: ...;
  --text-primary: ...;
  --text-secondary: ...;
  --border-subtle: ...;
  --border-strong: ...;
  --color-primary: ...;
}
```

如果没有提取到某个 token，不要输出空变量。

### 任务 9：暗色识别

实现简单亮度判断：

1. 优先使用 `#write` background。
2. fallback 使用 `body` background。
3. 支持 `#rgb`、`#rrggbb`、`rgb()`、`rgba()`。
4. 无法解析时 `isDark = false` 并 warning。

### 任务 10：转换器基础测试

如果项目已有测试框架，新增单元测试。

如果没有测试框架，至少新增一个本地可运行脚本：

```txt
scripts/test-typora-theme-converter.mjs
```

脚本输入几段内联 CSS，验证：

1. `#write h1` 被 scoped。
2. `body` 被丢弃。
3. `@import` 被丢弃。
4. 远程 URL 被丢弃。
5. 同名 id 追加后缀。
6. dark 主题可识别。

不要让验证只依赖人工点击。

## 阶段 3：Electron 文件 API

### 任务 11：主题目录

主题目录固定为：

```txt
~/ai-inbox/themes/
```

导入后结构：

```txt
~/ai-inbox/themes/<id>/theme.css
~/ai-inbox/themes/<id>/theme.json
```

### 任务 12：新增 IPC

新增这些能力：

```txt
theme:import-typora
theme:list-imported
theme:read
theme:delete
```

建议行为：

1. `theme:import-typora`：打开系统文件选择器，限制 `.css`，读取 CSS，调用 converter，写入主题目录，返回 metadata + warnings。
2. `theme:list-imported`：扫描 `~/ai-inbox/themes/*/theme.json`，返回 metadata 数组。
3. `theme:read`：按 id 读取 `theme.css` 和 `theme.json`。
4. `theme:delete`：删除指定 id 的主题目录。

安全要求：

1. id 必须走 slug 校验。
2. 任何读取/删除都不能路径穿越。
3. 文件写入只允许在 `~/ai-inbox/themes/` 内。
4. 不要允许 renderer 传任意路径让 main process 删除。

### 任务 13：preload / env / browser api

同步更新：

```txt
electron/preload.ts
src/env.d.ts
src/lib/browser-electron-api.ts
```

让 renderer 可以调用：

```ts
window.electronAPI.theme.importTypora()
window.electronAPI.theme.listImported()
window.electronAPI.theme.read(id)
window.electronAPI.theme.delete(id)
```

具体命名跟项目现有 IPC 风格保持一致。

## 阶段 4：Renderer 动态主题加载

### 任务 14：新增导入主题 composable

建议新增：

```txt
src/composables/useImportedThemes.ts
```

职责：

1. 加载导入主题 metadata 列表。
2. 导入 Typora CSS。
3. 删除导入主题。
4. 读取并注入当前导入主题 CSS。
5. 管理 warnings。

动态 CSS 注入方式：

```html
<style id="ai-inbox-imported-theme-style" data-imported-theme="..."></style>
```

切换回内置主题时，清空或移除该 style。

### 任务 15：应用外壳 data attribute

如果用户选择“应用到整个应用外观”，需要把根节点加上：

```txt
data-app-theme="<id>"
```

优先接入现有 `useTheme.ts` / `App.vue` 的主题系统，不要另起一套全局状态。

第一版可以把开关存入 settings：

```ts
importedAppThemeEnabled: boolean
editorTypographyTheme: string
```

如果 settings 类型已有集中定义，按现有风格扩展。

## 阶段 5：SettingsPage UI

### 任务 16：导入入口

在 `SettingsPage.vue` 外观/正文排版区域增加：

1. “导入 Typora 主题 CSS”按钮。
2. 导入成功后刷新主题列表。
3. 导入失败显示错误。
4. 导入 warnings 用可展开区域或小列表展示。

文案建议：

```txt
导入 Typora 主题 CSS
已忽略 6 条不兼容规则
```

### 任务 17：正文主题下拉

把内置主题和导入主题合并到一个下拉：

```txt
Typora GitHub
Default
Serif
Imported: Vue
Imported: Notion Dark · Dark
```

要求：

1. 导入主题 id 不再受 `TypographyTheme` union 限制。
2. 切换后立即保存 settings。
3. 设置页和文章页使用同一套主题选项来源。

### 任务 18：删除导入主题

在导入主题列表中提供删除按钮。

行为：

1. 删除前用现有 UI 模式确认。
2. 如果删除的是当前正在使用的正文主题，自动切回 `typora-github`。
3. 删除后刷新列表并移除已注入 CSS。

## 阶段 6：ArticlePage / ArticleBodyEditor 接入

### 任务 19：类型放宽

当前 `TypographyTheme` 是：

```ts
'default' | 'serif' | 'typora-github'
```

需要改成能同时支持导入主题。

建议：

```ts
export type BuiltInTypographyTheme = 'default' | 'serif' | 'typora-github'
export type TypographyTheme = BuiltInTypographyTheme | string
```

同时提供 helper：

```ts
export function isBuiltInTypographyTheme(value: string): value is BuiltInTypographyTheme
```

不要继续在页面里写多处：

```ts
value === 'default' || value === 'serif' || value === 'typora-github'
```

### 任务 20：ArticlePage 下拉支持导入主题

文章页 toolbar 里的“正文”下拉需要显示导入主题。

要求：

1. 页面加载时读取 imported themes。
2. 如果当前 settings 中的 theme 是导入主题，需要注入对应 CSS。
3. 切换内置主题时清理导入 CSS。
4. 切换导入主题时读取并注入对应 CSS。

### 任务 21：ArticleBodyEditor fallback

`ArticleBodyEditor` 内部同步 settings 时：

1. 不要拒绝未知字符串主题。
2. 如果主题为空或读取失败，fallback 到 `typora-github`。
3. 保持现有内置主题行为不变。

## 阶段 7：预览文档

### 任务 22：新增样本文档

新增：

```txt
docs/视觉优化/typora-theme-preview-sample.md
```

内容必须包含：

1. H1 / H2 / H3
2. 普通段落
3. 粗体、斜体、链接、行内代码
4. 引用块
5. 无序列表、有序列表、任务列表
6. TypeScript 代码块
7. 表格
8. 图片占位
9. 分割线

## 阶段 8：验证

### 任务 23：命令验证

至少运行：

```bash
npm run typecheck
npm run build
```

如果新增了 converter 脚本：

```bash
node scripts/test-typora-theme-converter.mjs
```

### 任务 24：手动验收

至少验证：

1. 导入一个简单 Typora CSS，主题列表出现新主题。
2. 导入同名 CSS 两次，第二个自动变成 `-2` 后缀。
3. 选择导入主题后，文章正文样式变化。
4. 勾选或启用应用外壳后，页面背景 / 文本 / 边框 token 有变化。
5. 切回内置主题后，导入 CSS 不再影响正文。
6. 删除当前导入主题后，自动 fallback 到 `typora-github`。
7. 导入含 `@import` / 远程 URL / `body` 规则的 CSS，会显示 warnings 且不污染全局。

## 推荐提交范围

本任务完成后建议一次 commit 包含：

```txt
package.json
package-lock.json
electron/main.ts
electron/preload.ts
src/env.d.ts
src/lib/browser-electron-api.ts
src/shared/imported-theme.ts
src/shared/typora-theme-converter.ts
src/composables/useImportedThemes.ts
src/components/ArticleBodyEditor.vue
src/modules/rich-editor/types/editor.ts
src/pages/ArticlePage.vue
src/pages/SettingsPage.vue
src/composables/useTheme.ts
src/App.vue
docs/视觉优化/typora-theme-preview-sample.md
docs/视觉优化/typora-theme-importer-execution-brief.md
scripts/test-typora-theme-converter.mjs
```

按实际改动调整，不要提交 `dist/`、`dist-electron/`、`release/` 构建产物。

## 完成后的回复格式

交付时请说明：

1. 转换器支持了哪些选择器。
2. 导入主题存在哪里。
3. 设置页如何导入 / 删除 / 选择。
4. 哪些规则会被 warnings 丢弃。
5. `npm run typecheck` 结果。
6. `npm run build` 结果。
7. 是否还有第一版未覆盖的 Typora 特性。
