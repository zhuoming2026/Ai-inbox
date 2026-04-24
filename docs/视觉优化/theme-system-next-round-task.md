# AI-inbox 主题系统下一轮任务清单

## 背景

当前主题系统已改成“一个主题 = 一个完整整体主题”。主题配置存在 `customThemes` 中，包含：

- App 样式
- 文章正文样式
- 代码区样式

Typora CSS 导入会转成普通完整主题，而不是单独的 Typora 样式列表。

当前提交基线：`7fce426e Unify theme import model`

本轮不要跑 Electron 打包。验证只跑：

```bash
npm run typecheck
node scripts/test-typora-theme-converter.mjs
```

## Task 1：增强 Typora CSS 转换，提炼主题“灵魂”

目标：Typora CSS 导入后不能只是文章 CSS，还要尽量生成完整主题配置。

修改范围优先：

- `src/shared/typora-theme-converter.ts`
- `src/styles/theme-presets.ts`
- `scripts/test-typora-theme-converter.mjs`

要求：

1. 从 Typora CSS 中提取更多语义 token：
   - `accent`：优先来自链接色 `a { color }`、`--primary-color`、选中/强调色。
   - `surface`：来自 `#write` / `body, #write` / `body` 背景色。
   - `ink`：来自正文颜色。
   - `heading`：来自标题颜色。
   - `font ui/body`：来自 `#write`、`body, #write`、`html, body, #write` 的 `font-family`。
   - `font code`：来自 `code` / `.md-fences` / `pre` 的 `font-family`。
   - `code block bg/text/border`：来自 `.md-fences`、`pre`, `code`。
   - `blockquote`、`table`、`inline-code` 相关变量。
2. Typora 导入应生成一个完整 `ThemePresetConfig`：
   - `theme.accent`
   - `theme.surface`
   - `theme.ink`
   - `theme.fonts.ui`
   - `theme.fonts.code`
   - `theme.semanticColors.skill`
   - `articleCss`
   - `codeCss`
3. `paper.css` 这类全局 Typora selector 必须能提取出：
   - `accent = #2875d9`
   - `font = Computer Modern`
   - code block background
   - 基础文章样式
4. 增加测试用例覆盖 `/Users/zhuoming/Downloads/paper.css` 的关键提取结果。不要依赖该绝对文件路径作为唯一测试，可把核心 CSS 片段写进测试脚本。

## Task 2：文章页面增加主题快捷入口

目标：方便在文章页面调试主题。

修改范围优先：

- `src/pages/ArticlePage.vue`
- `src/pages/SettingsPage.vue` 可复用逻辑时再动

实现优先级：

1. 在文章编辑页 toolbar 右侧增加一个“主题”图标按钮。
2. 点击后弹出轻量浮窗，内容尽量复用“设置 - 外观”的核心主题调试项：
   - 当前主题选择
   - 强调色
   - 背景色
   - 前景色
   - 字体设置入口
   - Typora 导入按钮可以先不放
3. 调整后实时应用主题，并保存 settings。
4. 如果浮窗出现渲染、样式、状态同步问题，则降级：
   - 改为一个设置按钮
   - 点击跳转 `/settings`
   - 并默认打开外观 section

验收：

- ArticlePage 不再提供“文章主题 / 代码主题”的独立选择。
- 入口是“整体主题调试入口”。
- 不影响正文编辑和保存。

## Task 3：扩展主题设置项

目标：设置页的主题编辑不只是一点强调色、背景色、前景色。

修改范围优先：

- `src/styles/theme-presets.ts`
- `src/composables/useTheme.ts`
- `src/pages/SettingsPage.vue`

新增设置项建议按优先级：

1. App 样式：
   - 强调色
   - 背景色
   - 面板色
   - 控件色
   - 前景色
   - 次级文字色
   - 边框强度 / 对比度
   - 圆角
   - 窗口透明度或 opaqueWindows
2. 文章正文样式：
   - 正文字体
   - 标题字体
   - 正文字号
   - 行高
   - 段落间距
   - 内容宽度
   - 标题颜色
   - 链接色
   - 引用块背景 / 边框
   - 表格边框 / 表头背景
3. 代码区样式：
   - 代码字体
   - 代码字号
   - inline code 背景
   - inline code 文字色
   - code block 背景
   - code block 文字色
   - code block 边框

要求：

- 新字段必须有 light fallback。
- 老主题缺字段时自动补齐。
- UI 不要堆成一大坨，建议分组：
  - App
  - 文章
  - 代码
  - 字体
- `useTheme.ts` 要实际应用这些 token。

## Task 4：字体设置改成“一个个字段”，不是一串字体

目标：字体设置不应该只有一个长字符串输入。

修改范围优先：

- `src/pages/SettingsPage.vue`
- `src/styles/theme-presets.ts`
- `electron/main.ts`
- `electron/preload.ts`
- `src/env.d.ts`
- `src/lib/browser-electron-api.ts`

要求：

1. 字体设置拆成：
   - App 字体
   - 文章正文字体
   - 文章标题字体
   - 代码字体
2. 每个字段用 select / combobox，不要让用户面对一整串 CSS font-family。
3. 字体来源：
   - 常见系统字体白名单
   - 主题文件夹里的字体文件
   - 未来可扩展系统字体枚举
4. 保存时可以仍然生成 CSS font-family 字符串，但 UI 层要是独立字段。
5. Typora 导入时：
   - `#write` 的 font-family 映射到文章正文字体
   - `h1-h6` font-family 映射到标题字体
   - code/pre font-family 映射到代码字体

## Task 5：普通主题导入格式校验与警告完善

目标：导入主题文件时行为符合预期。

修改范围优先：

- `src/pages/SettingsPage.vue`
- `src/styles/theme-presets.ts`

要求：

1. 导入主题格式必须类似 light 主题格式：
   - 有 `app` 或 `theme`
   - 可选 `articleCss`
   - 可选 `codeCss`
   - 可选 `name`
   - 可选 `variant`
2. 格式不对直接报错，不创建主题。
3. 格式对但字段缺失：
   - 用 light 主题补齐。
   - warning 中说明补齐了哪些关键字段。
4. 字段多了：
   - warning 中说明哪些 key 未使用。
   - 允许继续导入。
5. 弹框流程：
   - 先解析
   - 显示 warning
   - 用户填写主题名称
   - 用户点“导入”或“导入并应用”
   - 才创建主题

## Task 6：主题复制、重命名、删除规则细化

目标：设置页主题管理规则稳定。

修改范围：

- `src/pages/SettingsPage.vue`
- `src/styles/theme-presets.ts`

要求：

1. `light` 和 `dark`：
   - 不可删除
   - 可复制
   - 可重置
   - 可改显示名称的话，需要确认是否允许；默认建议不允许改 id，只允许改派生副本。
2. 其他主题：
   - 可删除
   - 可复制
   - 可改名字
3. 复制命名：
   - `xxx-复制`
   - 如果存在，`xxx-复制-2`
   - 再存在，`xxx-复制-3`
4. 删除当前正在应用的主题：
   - 如果是浅色主题，回退到 `light`
   - 如果是深色主题，回退到 `dark`
   - 保存 settings 并立即应用

## Task 7：准备“打开主题文件编辑”的技术方案

这项可以先做设计文档，不一定本轮实现。

目标：未来主题能落成真实文件，用户可以打开编辑。

需要产出：

- 主题文件建议路径，例如：
  - `~/ai-inbox/themes/<theme-id>/theme.json`
  - 或 `~/ai-inbox/themes/<theme-id>/theme.css`
- 是否继续以 `customThemes` 为 source of truth，还是迁移到文件系统。
- Electron IPC：
  - `theme:open-file`
  - `theme:read-theme-file`
  - `theme:save-theme-file`
  - `theme:sync-files`
- 设置页按钮：
  - “打开主题文件”
  - “从文件重新加载”

注意：不要在这轮破坏现有 settings 存储。

## 验收标准

1. `paper.css` 导入后主题明显带有 paper 的蓝色强调色、Computer Modern 字体、代码区浅灰背景。
2. 设置页没有“文章主题”和“代码主题”的独立切换。
3. 文章页主题入口是整体主题入口。
4. light/dark 不可删除，只有它们可重置。
5. 主题复制会创建新主题，而不是复制 JSON 到剪贴板。
6. 普通主题导入能校验格式、提示 warning、补齐缺失字段。
7. 验证通过：
   ```bash
   npm run typecheck
   node scripts/test-typora-theme-converter.mjs
   ```
8. 不运行 Electron 打包。
