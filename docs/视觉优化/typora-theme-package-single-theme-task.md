# Typora 导入主题包单一主题模型任务单

## 目标

把当前 Typora CSS 导入流程从“分散的正文主题 / 代码主题 / App 主题”收敛成一个整体主题模型。

最终用户心智必须是：

```txt
选择一个 Typora.css
生成一个 ai-inbox 主题
启用这个主题
```

设置页只暴露一个“当前主题”。不要再让用户在默认流程里分别选择 App 外壳、正文排版、代码块主题。

## 必须遵守的产品决策

1. 一个导入主题是一个整体主题包。
2. 一个主题包同时包含：
   - App 外观 token
   - 正文排版样式
   - 代码块样式
   - 字体 token
3. 用户导入 Typora CSS 后，只需要确认主题名和导入动作。
4. 导入确认框只允许两个动作：
   - `导入并启用`
   - `仅导入`
5. 不做三段式开关：
   - 不做“是否应用到整个应用”
   - 不做“是否设为当前正文主题”
   - 不做“是否设为当前代码主题”
6. 不做混搭。
7. 不做高级编辑。
8. 不做 zip 导入、远程下载、主题市场、字体文件导入。
9. 可以保留内部兼容字段，但 UI 不展示分散选择。

## 目标文件结构

导入后的主题目录必须是：

```txt
~/ai-inbox/themes/<theme-id>/
  theme.json
  theme.css
  assets/
    fonts/
    images/
```

第一版必须创建 `theme.json` 和 `theme.css`。

第一版必须创建 `assets/fonts/` 和 `assets/images/` 目录，即使暂时为空。

不要再输出多个独立 CSS 文件，例如：

```txt
app.css
typography.css
code.css
```

统一输出到：

```txt
theme.css
```

## theme.json 格式

`theme.json` 必须使用以下结构：

```json
{
  "id": "typora-sample",
  "name": "Sample",
  "source": "typora",
  "sourceFileName": "sample.css",
  "createdAt": "2026-04-24T00:00:00.000Z",
  "isDark": false,
  "warnings": [],
  "assets": {
    "fontsDir": "assets/fonts",
    "imagesDir": "assets/images"
  }
}
```

不要再使用这些作为用户可操作字段：

```json
{
  "supportsTypography": true,
  "supportsAppShell": true
}
```

如果现有代码依赖它们，可以临时保留用于兼容，但新的 UI 和新的文档中不展示。

## theme.css 输出结构

`theme.css` 必须只有一个主题入口：

```css
[data-ai-theme='typora-sample'] {
  --bg-primary: ...;
  --bg-secondary: ...;
  --bg-card: ...;
  --text-primary: ...;
  --text-secondary: ...;
  --border-subtle: ...;
  --border-strong: ...;
  --color-primary: ...;

  --typography-font-body: ...;
  --typography-font-heading: ...;
  --typography-font-code: ...;
  --typography-text: ...;
  --typography-heading: ...;
  --typography-link: ...;
  --typography-code-block-bg: ...;
  --typography-code-block-color: ...;
}
```

正文样式必须 scoped 到同一个入口：

```css
[data-ai-theme='typora-sample'] .tiptap h1,
[data-ai-theme='typora-sample'] .rich-editor__content h1 {
  ...
}
```

代码块样式也必须 scoped 到同一个入口：

```css
[data-ai-theme='typora-sample'] .tiptap pre,
[data-ai-theme='typora-sample'] .rich-editor__content pre {
  ...
}
```

不再输出新的：

```css
[data-app-theme='...']
[data-typography-theme='...']
[data-code-theme='...']
```

如果旧代码仍需要这些属性，可以在运行时兼容旧主题，但新导入主题必须输出 `data-ai-theme` 版本。

## 数据模型改造

### 任务 1：更新共享类型

修改：

```txt
src/shared/imported-theme.ts
```

把导入主题命名为整体主题，不再暴露为 typography-only。

必须提供：

```ts
export interface ImportedThemeMetadata {
  id: string
  name: string
  source: 'typora'
  sourceFileName: string
  createdAt: string
  isDark: boolean
  warnings: string[]
  assets: {
    fontsDir: string
    imagesDir: string
  }
}

export interface ImportedThemeRecord {
  metadata: ImportedThemeMetadata
  css: string
}

export interface TyporaThemeImportDraft {
  id: string
  name: string
  css: string
  metadata: ImportedThemeMetadata
  warnings: string[]
}
```

如果现有返回类型需要保留，必须命名为兼容类型，不要作为新主模型。

## Converter 改造

### 任务 2：converter 输出单一主题入口

修改：

```txt
src/shared/typora-theme-converter.ts
```

转换器输出的 CSS 必须全部基于：

```css
[data-ai-theme='<id>']
```

不要再生成：

```css
[data-app-theme='<id>']
[data-typography-theme='<id>']
```

token 块必须合并为一个：

```css
[data-ai-theme='<id>'] {
  ...
}
```

### 任务 3：selector mapper 改为 data-ai-theme

现有 mapper 已经修复 selector 泄漏问题。必须在这个基础上把输出前缀改成：

```txt
[data-ai-theme='<id>'] .tiptap ...
[data-ai-theme='<id>'] .rich-editor__content ...
```

转换示例：

输入：

```css
#write h1 { color: red; }
```

输出：

```css
[data-ai-theme='typora-sample'] .tiptap h1,
[data-ai-theme='typora-sample'] .rich-editor__content h1 {
  color: red;
}
```

输入：

```css
.md-fences code { color: blue; }
```

输出：

```css
[data-ai-theme='typora-sample'] .tiptap pre code,
[data-ai-theme='typora-sample'] .rich-editor__content pre code {
  color: blue;
}
```

### 任务 4：converter 返回草稿，不直接表达启用范围

转换结果必须是主题草稿：

```ts
{
  id,
  name,
  css,
  metadata,
  warnings
}
```

不要返回：

```ts
supportsTypography
supportsAppShell
applyToApp
applyToTypography
applyToCode
```

## Electron IPC 改造

### 任务 5：导入流程拆成 preview 和 save

当前导入 IPC 如果是“选择文件后直接写入主题目录”，必须改成两步。

新增或调整 IPC：

```txt
theme:preview-typora
theme:save-imported
theme:list-imported
theme:read
theme:delete
```

行为必须如下：

### `theme:preview-typora`

1. 打开系统文件选择器。
2. 只允许选择 `.css`。
3. 读取 Typora CSS。
4. 调用 converter。
5. 返回主题草稿 `{ id, name, css, metadata, warnings }`。
6. 不写入磁盘。

### `theme:save-imported`

输入：

```ts
{
  draft: TyporaThemeImportDraft
  name: string
  activate: boolean
}
```

行为：

1. 使用用户确认后的 `name` 重新生成 slug。
2. 如果 slug 冲突，追加数字后缀。
3. 更新 css 中的旧 id 为新 id。
4. 写入：

```txt
~/ai-inbox/themes/<id>/theme.json
~/ai-inbox/themes/<id>/theme.css
~/ai-inbox/themes/<id>/assets/fonts/
~/ai-inbox/themes/<id>/assets/images/
```

5. 返回保存后的主题 record。
6. 如果 `activate === true`，同时更新 settings 的当前整体主题字段。

### `theme:list-imported`

返回所有 `theme.json`。

### `theme:read`

按 id 读取 `theme.json` 和 `theme.css`。

### `theme:delete`

按 id 删除整个主题目录。

## Settings / 状态模型改造

### 任务 6：新增整体当前主题字段

settings 中必须新增：

```ts
activeThemeId: string
```

默认值：

```ts
activeThemeId: 'typora-github'
```

现有字段可以暂时保留：

```ts
editorTypographyTheme
editorCodeTheme
themeMode
lightTheme
darkTheme
```

但是设置页新 UI 不再把它们作为主入口。

启用导入主题时，必须写：

```ts
activeThemeId = '<imported-theme-id>'
```

切回内置主题时，必须写：

```ts
activeThemeId = '<built-in-theme-id>'
```

### 任务 7：统一主题注入

修改：

```txt
src/composables/useImportedThemes.ts
```

把注入函数改成设置：

```ts
document.documentElement.setAttribute('data-ai-theme', id)
```

不要再设置：

```ts
data-app-theme
data-typography-theme
data-code-theme
```

清理主题时移除：

```ts
data-ai-theme
```

内置主题也必须能设置 `data-ai-theme`。

## 设置页 UI 改造

### 任务 8：设置页只保留当前主题入口

修改：

```txt
src/pages/SettingsPage.vue
```

外观页必须提供一个主选择器：

```txt
当前主题：[主题下拉]
```

下拉内容：

```txt
Typora GitHub
Default
Newsprint
导入：xxx
导入：yyy · 深色
```

不再显示独立主入口：

```txt
正文排版
正文代码样式
```

如果为了兼容必须暂时保留旧字段，必须放到注释或内部逻辑，不在 UI 显示。

### 任务 9：导入 Typora CSS 确认弹窗

点击：

```txt
导入 Typora CSS
```

流程：

1. 调用 `theme:preview-typora`。
2. 如果用户取消文件选择，不显示弹窗。
3. 如果 preview 成功，显示确认弹窗。

弹窗必须包含：

```txt
主题名：[输入框，默认文件名或 CSS name]
Warnings：[列表，有则展示]
[仅导入]
[导入并启用]
```

弹窗不能包含：

```txt
是否应用到整个应用
是否设为当前正文主题
是否设为当前代码主题
```

### 任务 10：主题列表

设置页必须展示导入主题列表。

每项显示：

```txt
主题名
深色标识（如果 isDark）
删除按钮
```

所有导入主题都必须显示删除按钮。

删除当前主题时：

1. 删除主题。
2. `activeThemeId` 切回 `typora-github`。
3. 清理已注入 CSS。
4. 保存 settings。

删除非当前主题时：

1. 删除主题。
2. 不改变 `activeThemeId`。

## ArticlePage / Editor 接入

### 任务 11：ArticlePage 使用 activeThemeId

修改：

```txt
src/pages/ArticlePage.vue
src/components/ArticleBodyEditor.vue
src/modules/rich-editor/components/RichEditor.vue
```

ArticlePage 的 toolbar 不再显示：

```txt
正文下拉
代码下拉
```

如果仍需要编辑器内快速切换主题，只允许显示一个：

```txt
主题：[当前主题下拉]
```

该下拉绑定 `activeThemeId`。

切换主题时：

1. 如果是内置主题，设置 `data-ai-theme`。
2. 如果是导入主题，读取 `theme.css`，注入并设置 `data-ai-theme`。
3. 保存 `activeThemeId`。

### 任务 12：兼容旧 typography/code prop

RichEditor 内部可以暂时保留：

```ts
typographyTheme
codeTheme
```

但新主题系统必须优先读取 `data-ai-theme` 的变量。

不要在本轮删除旧主题系统，避免扩大风险。

## 内置主题兼容

### 任务 13：给内置主题补 data-ai-theme 入口

现有内置主题：

```txt
typora-github
default
serif
```

必须能通过：

```css
[data-ai-theme='typora-github']
[data-ai-theme='default']
[data-ai-theme='serif']
```

生效。

可以保留旧选择器：

```css
[data-typography-theme='typora-github']
```

但必须新增 `data-ai-theme` 兼容入口。

## 验证脚本改造

### 任务 14：更新 converter 验证脚本

修改：

```txt
scripts/test-typora-theme-converter.mjs
```

断言必须改为：

```txt
[data-ai-theme='typora-sample'] .tiptap h1
[data-ai-theme='typora-sample'] .rich-editor__content h1
[data-ai-theme='typora-sample'] .tiptap pre code
[data-ai-theme='typora-sample'] .rich-editor__content pre code
```

必须断言不再出现：

```txt
[data-typography-theme='typora-sample']
[data-app-theme='typora-sample']
[data-code-theme='typora-sample']
```

## 不做内容

本轮明确不做：

1. 三段式开关。
2. 混搭。
3. 高级主题编辑器。
4. 字体文件导入。
5. 图片资源导入。
6. zip 主题包导入。
7. 远程下载主题。
8. 主题市场。

## 验收命令

必须运行：

```bash
node scripts/test-typora-theme-converter.mjs
npm run typecheck
npm run build
```

## 验收标准

1. 导入 Typora CSS 后先出现确认弹窗，而不是直接保存。
2. 确认弹窗可以修改主题名。
3. 确认弹窗只有“仅导入”和“导入并启用”两个动作。
4. 保存后生成 `~/ai-inbox/themes/<id>/theme.json`。
5. 保存后生成 `~/ai-inbox/themes/<id>/theme.css`。
6. 保存后生成 `assets/fonts/`。
7. 保存后生成 `assets/images/`。
8. `theme.css` 只使用 `[data-ai-theme='<id>']` 作为主题入口。
9. 设置页只显示一个“当前主题”主入口。
10. ArticlePage 工具栏如果保留主题选择，也只能显示一个整体主题选择。
11. 启用导入主题后，App 外壳、正文、代码块使用同一个 `data-ai-theme`。
12. 删除当前主题后 fallback 到 `typora-github`。
13. 删除非当前主题不改变当前主题。
14. converter 验证脚本通过。
15. `npm run typecheck` 通过。
16. `npm run build` 通过。
