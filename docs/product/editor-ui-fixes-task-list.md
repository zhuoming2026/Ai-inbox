# 编辑器 UI 修复任务清单

## 背景

当前编辑器已经完成一轮功能收口，但还有 4 个明显的 UI / 交互问题，需要继续修复。

本任务单的目标是：

1. 让编辑区滚动行为正确
2. 让 Bubble Menu 可用且视觉正确
3. 让 frontmatter panel 浮空而不挤压编辑区布局
4. 让 slash 菜单更简洁、样式更清爽

本轮重点是 **体验修复**，不是继续扩功能。

---

## 任务目标

完成后应达到：

1. 导航栏固定不动，只有正文编辑区滚动
2. Bubble Menu 白底显示，按钮可点击且真实生效
3. `frontmatter-panel` 浮在 `editor-area` 上层，不影响 `editor-panel` 布局流
4. Slash 菜单白底、简洁、每行只保留 `icon + 简短标题`

---

## 一、滚动区域修复

### 问题

当前页面滚动区域不对，用户希望：

- 导航栏不滚动
- 只滚动正文编辑区
- 也就是让 `class="tiptap ProseMirror rich-editor__content"` 所在区域承担滚动

### 目标

页面结构应变成：

- 顶部导航固定在编辑页顶部
- 编辑器外层容器不整体滚动
- 正文内容区域单独滚动

### 执行要求

1. 检查这些容器的高度链和 `overflow`：
   - `ArticlePage.vue`
   - `editor-area`
   - `editor-surface`
   - `ArticleBodyEditor.vue`
   - `.rich-editor`
   - `.rich-editor__content`

2. 保证只有正文内容区域承担纵向滚动
3. 顶部导航栏保持静止
4. 不要通过“给整个页面加固定高度 + 强行隐藏滚动”做脆弱修补

### 推荐方向

- 通过 `display: flex` + `min-height: 0` + 正确的 `overflow-y: auto`
- 让 `.rich-editor__content` 或其紧邻内容容器成为真正滚动层

### 验收标准

1. 编辑页滚动时，顶部导航栏不动
2. 只滚动正文区域
3. frontmatter 展开/收起时，正文滚动行为不乱

---

## 二、Bubble Menu 修复

### 问题

当前 Bubble Menu：

- 能显示
- 但应该改成白色
- 且内部按钮点击无效

### 目标

Bubble Menu 需要成为真正可用的白色浮层工具栏。

### 执行要求

1. 样式改成白底风格
2. 保证文字/图标颜色在白底上可读
3. 核查按钮点击链路：
   - 按钮点击是否真正触发 `executeToolbarItem`
   - `slot='link'` 的按钮是否还能打开 Link Popover
   - 非 link 按钮是否正确调用编辑器动作

4. 不要只修视觉，不修点击行为

### 建议重点检查文件

- `src/modules/rich-editor/components/RichEditorBubbleMenu.vue`
- `src/modules/rich-editor/components/RichEditorToolbar.vue`
- `src/modules/rich-editor/composables/useToolbarItems.ts`
- `src/modules/rich-editor/styles/editor.css`

### 验收标准

1. Bubble Menu 白底显示
2. Bold / Italic / Underline / Strike / Code 可点击
3. Link 按钮可以打开 Link Popover
4. 不再出现“能看到菜单但点击无效”

---

## 三、Frontmatter Panel 浮空化

### 问题

用户希望：

- `frontmatter-panel` 浮空于 `editor-area`
- 不影响 `editor-panel` 的布局

当前问题本质上是：

- frontmatter panel 仍在布局流中挤压了正文编辑区域

### 目标

让 `frontmatter-panel` 变成覆盖式浮层，而不是参与普通布局流。

### 执行要求

1. `frontmatter-panel` 改为浮层定位
2. `editor-panel` / `editor-surface` 的主布局宽高不要再被 frontmatter panel 直接挤压
3. 展开时 panel 覆盖在 `editor-area` 上方或侧边
4. 收起时不残留空白占位

### 设计要求

- 浮层视觉要和编辑器区域协调
- 不要影响正文滚动层
- 保证展开/关闭动画或状态切换自然

### 建议重点检查文件

- `src/pages/ArticlePage.vue`

### 验收标准

1. 展开 frontmatter panel 时，不再挤压 editor 主区域
2. 收起后不留布局空洞
3. 编辑器正文滚动行为保持正常

---

## 四、Slash 菜单视觉与内容精简

### 问题

当前 slash 菜单：

- 功能能用
- 但需要改成白色
- 内容太啰嗦
- 每一行只要 `icon + 简短标题`

### 目标

把 slash 菜单收成一个简洁、可快速扫读的白色命令菜单。

### 执行要求

1. 菜单改成白底
2. 每个菜单项只保留：
   - 图标
   - 简短标题
3. 去掉 description 区块
4. 去掉冗长分组展示（如果当前分组让界面显得臃肿）
5. 保持 hover / selected 状态清晰

### 建议处理方式

- 如果现在 `SuggestionMenu` 是按 group 渲染，可以评估是否改成单层列表
- 如果仍保留 group，至少不要渲染 description
- 最终目标是“更轻、更快扫读”，不是信息更全

### 建议重点检查文件

- `src/modules/rich-editor/components/RichEditorSuggestionMenu.vue`
- `src/modules/rich-editor/config/suggestion-menu.ts`
- `src/modules/rich-editor/styles/editor.css`

### 验收标准

1. Slash 菜单白底显示
2. 每行只有 icon + 简短标题
3. 键盘选择态和 hover 态仍清晰可见
4. 点击和 Enter 执行不受影响

---

## 推荐执行顺序

请按下面顺序做：

1. 先修 Bubble Menu 点击无效
2. 再修编辑区滚动层
3. 再做 frontmatter panel 浮空化
4. 最后统一 slash 菜单白底和精简样式

原因：

- Bubble Menu 点击无效属于明确功能问题，优先级最高
- 滚动层问题影响整体使用体验
- frontmatter 浮空化属于布局层问题
- slash 白底和精简属于视觉优化，但不要在前面几个没稳时先动

---

## 交付要求

本轮执行后请交付：

1. 修改文件列表
2. 每个问题分别是如何修的
3. 哪些是功能修复，哪些是纯样式修复
4. `npm run typecheck` 结果
5. 如果跑了，附 `npm run build` 结果

另外请在交付说明里，逐条对应这 4 个目标写清楚：

1. 导航栏固定、正文滚动
2. Bubble Menu 白底且按钮可点
3. frontmatter panel 浮空不挤压编辑区
4. slash 菜单白底、精简为 icon + 标题

---

## 不要做的事

这轮不要顺手：

1. 重做整个编辑器视觉风格
2. 引入新的 UI 框架
3. 扩新的编辑器功能
4. 改 markdown 序列化逻辑
5. 改保存逻辑

本轮只做当前这 4 个明确问题。

---

## 我这边的 Review 标准

我后续 review 时会重点看：

1. Bubble Menu 是否真的能点击并触发动作
2. 是否真的只有正文在滚动
3. frontmatter panel 是否真的脱离布局流
4. slash 菜单是否真的只剩 icon + 短标题
5. 改动是否仍然保持宿主层和编辑器模块职责清晰
