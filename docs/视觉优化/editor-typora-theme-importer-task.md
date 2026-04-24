# Typora 主题导入与转换任务清单

## 背景

Typora 主题站已经有大量成熟的 Markdown 写作主题。我们希望 ai-inbox 能复用这些主题的视觉资产，不是为了做主题市场，而是为了让用户可以把 Typora CSS 导入进来，转换成 ai-inbox 可用的主题。

Typora 主题本质上通常是：

- 一个 `.css` 文件
- 可选字体、图片、背景资源
- 面向 Typora DOM 的选择器，例如 `#write`、`.md-fences`、`.cm-s-inner`

ai-inbox 的编辑器是 TipTap，正文 DOM 与 Typora 不一致，因此不要直接把 Typora CSS 全局注入应用。正确方向是做一个 **Typora Theme Importer / Converter**。

## 目标

把 Typora CSS 转换成两类 ai-inbox 主题能力：

1. **编辑器正文主题**
   - 尽量还原 Typora 主题在 Markdown 内容区的排版、颜色、代码块、引用、表格等效果。

2. **应用外壳主题**
   - 从 Typora CSS 中提取背景、文字、边框、链接、代码块等颜色和字体，映射成 ai-inbox 的全局主题 token，让首页、文章页、设置页也能呈现相近气质。

最终效果不是 100% 复刻 Typora，而是：

- 正文区域尽量保真。
- 应用外壳提取风格，保持 ai-inbox 自己的组件结构和交互。

## 不要做

1. 不要直接把 Typora CSS 作为全局样式注入。
2. 不要让 Typora CSS 影响 toolbar、popover、按钮、设置页表单等组件内部结构。
3. 不要用正则硬切 CSS，优先使用 PostCSS 等结构化 CSS parser。
4. 不要第一版就支持完整主题市场、远程下载、在线仓库同步。
5. 不要默认信任外部 CSS 中的远程字体、远程图片、`@import`。

## 第一阶段：调研与样本选择

### 任务 1：选择 3-5 个 Typora 主题作为转换样本

建议样本：

1. GitHub / GitHub Dark 类主题
2. Notion 类主题
3. Typora Themeable
4. Maize / Paper 类温和写作主题
5. 一个差异较大的深色主题

要求记录：

- 主题名称
- 来源 URL
- GitHub / 下载地址
- license
- 是否包含字体或图片资源
- CSS 中主要选择器类型

### 任务 2：整理 Typora 主题常见选择器

输出一份高频选择器清单，至少覆盖：

```txt
#write
#write h1
#write h2
#write h3
#write p
#write a
#write blockquote
#write ul
#write ol
#write li
#write table
#write th
#write td
#write img
#write pre
#write code
.md-fences
.md-fences code
.task-list
```

同时整理第一版应该丢弃的选择器：

```txt
html
body
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

## 第二阶段：定义 ai-inbox 主题目标格式

### 任务 3：定义导入后文件结构

建议导入后的主题存放为：

```txt
~/ai-inbox/themes/
  typora-github/
    theme.css
    theme.json
```

其中 `theme.css` 是转换后的 ai-inbox 可用 CSS，`theme.json` 存元数据。

示例：

```json
{
  "id": "typora-github",
  "name": "Typora GitHub",
  "source": "typora",
  "sourceUrl": "https://theme.typora.io/",
  "createdAt": "2026-04-24T00:00:00.000Z",
  "supportsTypography": true,
  "supportsAppShell": true,
  "isDark": false
}
```

### 任务 4：定义 CSS 输出结构

转换后的 CSS 必须 scoped 到主题容器下，不能污染全局。

建议输出：

```css
[data-typography-theme='typora-github-imported'] {
  --typography-font-body: ...;
  --typography-font-heading: ...;
  --typography-font-code: ...;
  --typography-text: ...;
  --typography-heading: ...;
  --typography-link: ...;
  --typography-code-block-bg: ...;
  --typography-code-block-color: ...;
}

[data-app-theme='typora-github-imported'] {
  --bg-primary: ...;
  --bg-secondary: ...;
  --bg-card: ...;
  --text-primary: ...;
  --text-secondary: ...;
  --border-subtle: ...;
  --border-strong: ...;
  --color-primary: ...;
}

[data-typography-theme='typora-github-imported'] .tiptap h1,
[data-typography-theme='typora-github-imported'] .rich-editor__content h1 {
  ...
}
```

### 任务 5：定义 token 映射表

从 Typora CSS 提取这些语义：

```txt
Typora background        -> --bg-primary / --typography-bg
Typora text color        -> --text-primary / --typography-text
Typora heading color     -> --typography-heading
Typora muted color       -> --text-secondary / --typography-placeholder
Typora link color        -> --color-primary / --typography-link
Typora border color      -> --border-subtle / --typography-table-border
Typora code background   -> --typography-code-block-bg / --bg-secondary
Typora inline code color -> --typography-inline-code-color
Typora quote border      -> --typography-blockquote-border
Typora quote background  -> --typography-blockquote-bg
Typora font-family       -> --typography-font-body
Typora monospace font    -> --typography-font-code
```

如果主题中没有某项，使用 ai-inbox 当前主题 fallback，不要硬造过多颜色。

## 第三阶段：实现转换器

### 任务 6：新增转换模块

建议新增：

```txt
src/shared/typora-theme-converter.ts
```

职责：

1. 接收 Typora CSS 文本。
2. 使用 PostCSS 解析 CSS AST。
3. 提取 token 候选值。
4. 转换可支持的选择器。
5. 丢弃不支持或不安全规则。
6. 输出 `{ css, metadata, warnings }`。

建议类型：

```ts
interface TyporaThemeConversionResult {
  css: string
  metadata: {
    id: string
    name: string
    source: 'typora'
    isDark: boolean
    supportsTypography: boolean
    supportsAppShell: boolean
  }
  warnings: string[]
}
```

### 任务 7：使用 PostCSS，不用正则解析 CSS

如果项目还没有 PostCSS runtime 依赖，需要评估是否复用已有构建依赖。

优先方案：

1. 如果 `postcss` 已经在依赖树中可 import，直接使用。
2. 如果不可用，再新增明确依赖。

不要用正则处理嵌套规则、多个 selector、注释、media query、变量。

### 任务 8：实现选择器映射

第一版支持这些映射：

```txt
#write                         -> [data-typography-theme='<id>'] .tiptap
#write h1                      -> [data-typography-theme='<id>'] .tiptap h1
#write h2                      -> [data-typography-theme='<id>'] .tiptap h2
#write h3                      -> [data-typography-theme='<id>'] .tiptap h3
#write p                       -> [data-typography-theme='<id>'] .tiptap p
#write a                       -> [data-typography-theme='<id>'] .tiptap a
#write blockquote              -> [data-typography-theme='<id>'] .tiptap blockquote
#write ul                      -> [data-typography-theme='<id>'] .tiptap ul
#write ol                      -> [data-typography-theme='<id>'] .tiptap ol
#write li                      -> [data-typography-theme='<id>'] .tiptap li
#write table                   -> [data-typography-theme='<id>'] .tiptap table
#write th                      -> [data-typography-theme='<id>'] .tiptap th
#write td                      -> [data-typography-theme='<id>'] .tiptap td
#write img                     -> [data-typography-theme='<id>'] .tiptap img
#write pre                     -> [data-typography-theme='<id>'] .tiptap pre
#write code                    -> [data-typography-theme='<id>'] .tiptap code
.md-fences                     -> [data-typography-theme='<id>'] .tiptap pre
.md-fences code                -> [data-typography-theme='<id>'] .tiptap pre code
```

可同时输出 `.rich-editor__content` 版本，保证兼容：

```css
[data-typography-theme='<id>'] .tiptap h1,
[data-typography-theme='<id>'] .rich-editor__content h1 {
  ...
}
```

### 任务 9：实现规则过滤

第一版丢弃：

1. `html` / `body` 全局规则。
2. Typora 侧边栏、文件树、outline、菜单相关规则。
3. CodeMirror / source mode 相关规则。
4. `@import` 远程资源。
5. 包含远程 URL 的字体和背景资源。
6. 可能影响全局布局的 `position: fixed`、`z-index`、`overflow` 等非正文必要规则。

转换结果中把丢弃原因写入 `warnings`。

### 任务 10：实现暗色主题识别

根据背景和文字颜色粗略判断：

1. 提取 `#write` 或 `body` 的 `background`。
2. 计算颜色亮度。
3. 亮度低于阈值标记 `isDark: true`。
4. 如果无法判断，默认 `false`，并给 warning。

## 第四阶段：接入应用

### 任务 11：main process 文件 API

新增或扩展 Electron main process IPC：

```txt
theme:import-typora
theme:list-imported
theme:read
theme:delete
```

要求：

1. 文件读写只在 main process 完成。
2. 导入目录限制在 `~/ai-inbox/themes/`。
3. 不允许写入项目源码目录。
4. 不允许路径穿越。

### 任务 12：renderer 主题加载

在 renderer 中支持加载导入主题：

1. App 启动时读取 `~/ai-inbox/themes/` 下的 theme metadata。
2. 用户选择主题时加载对应 CSS。
3. 将 CSS 注入到一个专用 `<style data-imported-theme>` 节点。
4. 切换主题时替换该 style 内容。
5. 当前主题 id 写入 settings。

### 任务 13：SettingsPage 增加导入入口

设置页增加：

1. “导入 Typora 主题 CSS”按钮。
2. 导入后展示主题名称。
3. 支持选择导入主题作为正文主题。
4. 支持选择“应用到整个应用外观”。
5. 显示转换 warnings，例如“已忽略远程字体”“已忽略 Typora sidebar 样式”。

第一版可以不做拖拽上传，只用系统文件选择器。

### 任务 14：ArticlePage / ArticleBodyEditor 接入导入主题

要求：

1. `TypographyTheme` 类型要能支持内置主题和导入主题。
2. 不要把导入主题硬编码到 union type 中。
3. 现有内置主题仍然可选。
4. 当前文章页 toolbar 中的正文主题下拉应展示导入主题。

建议把主题选项从静态数组改为：

```ts
const builtInTypographyThemes = [...]
const importedTypographyThemes = ref(...)
const typographyThemeOptions = computed(() => [
  ...builtInTypographyThemes,
  ...importedTypographyThemes.value,
])
```

## 第五阶段：预览与验证

### 任务 15：新增主题预览样本文档

新增：

```txt
docs/视觉优化/typora-theme-preview-sample.md
```

样本文档要包含：

1. H1 / H2 / H3
2. 普通段落
3. 粗体、斜体、链接、行内代码
4. 引用块
5. 无序列表、有序列表、任务列表
6. 代码块
7. 表格
8. 图片占位
9. 分割线

### 任务 16：转换质量验收

每个样本主题至少检查：

1. 正文背景和文字颜色是否接近原主题。
2. 标题层级是否明显。
3. 引用块是否可读。
4. 代码块是否可读。
5. 表格边框和背景是否合理。
6. 链接颜色是否明显。
7. 应用外壳没有被 Typora CSS 污染。
8. 切换回内置主题后样式能恢复。

## MVP 范围

第一版只需要做到：

1. 选择一个 `.css` 文件。
2. 转换 `#write` / Markdown 内容相关规则。
3. 生成 scoped typography CSS。
4. 提取少量 app token。
5. 保存到 `~/ai-inbox/themes/`。
6. 在设置页和文章页可选择导入主题。
7. 显示 warnings。

第一版可以暂不支持：

1. 远程主题下载。
2. 自动下载字体和图片资源。
3. 完整 Typora source mode 样式。
4. 主题包 zip 导入。
5. 在线主题市场。

## 验收命令

完成实现后至少运行：

```bash
npm run typecheck
npm run build
```

如果新增 converter 单元测试，再补充：

```bash
npm run test
```

## 关键验收标准

1. 导入普通 Typora CSS 不会污染全局 App 样式。
2. 导入后正文区域能明显呈现 Typora 主题风格。
3. 应用外壳能提取到接近主题气质的颜色，而不是完全无变化。
4. 不安全或不支持规则会被忽略，并明确显示 warning。
5. 用户可以切换回内置主题。
6. 导入主题文件存储在用户数据目录，不写入源码目录。
