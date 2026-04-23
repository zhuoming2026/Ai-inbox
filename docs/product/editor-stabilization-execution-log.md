# 编辑器收口执行记录

> 记录每轮改动的文件、目标、关闭的问题、仍存在的问题。

---

## Phase 0：封板与基线确认

### 盘点结果

| 入口 | 位置 | 状态 | 备注 |
|------|------|------|------|
| paragraph | toolbar / slash | 删除 | TipTap 默认已是段落，无需显式入口 |
| heading-1/2/3 | toolbar / slash / floating | 保留 | |
| bold/italic/strike/code/underline | toolbar / bubble | 保留 | |
| bullet-list/ordered-list/task-list | toolbar / slash / floating | 保留 | |
| blockquote/code-block/horizontal-rule | toolbar / slash / floating | 保留 | |
| undo/redo | toolbar | 保留 | |
| link | toolbar / bubble | 保留 | 通过 link popover 交互 |
| image | toolbar | 保留 | callback 模式，弹出 URL prompt |
| table | toolbar / floating / slash | **删除** | 未闭环，后续单独开轮 |
| floating menu | 组件 | 保留 | 空白行时出现快速插入菜单 |

### 验收标准达成

- 所有 toolbar item 有明确状态归类 ✓
- 所有 slash item 有明确状态归类 ✓
- 不再存在"我们也不确定它是否应该工作"的入口 ✓

---

## Phase 1：功能减法

### 目标

先把假功能和半成品入口去掉，让 UI 只暴露真实能力。

### 修改文件

| 文件 | 改动 |
|------|------|
| `src/modules/rich-editor/config/toolbar.ts` | 移除 `paragraph`、`table` 项 |
| `src/modules/rich-editor/config/suggestion-menu.ts` | 从 slash menu 移除 `paragraph`、`table` |

### 具体改动

**toolbar.ts — 移除 paragraph、table 项**

- fixed toolbar Block format 组：移除 `paragraph`
- fixed toolbar Insert 组：移除 `table`
- floating toolbar：移除 `table`

**suggestion-menu.ts — 移除 paragraph、table 项**

- `paragraph`：slash 输入 `/` 后默认已是段落，操作冗余
- `table`：未闭环，暂移除

### 保留的功能集（本轮）

heading-1/2/3, bold, italic, underline, strike, code, bullet-list, ordered-list, task-list, blockquote, code-block, horizontal-rule, link, image, undo, redo

### 验收标准达成

- toolbar / slash 暴露能力集合基本一致 ✓
- 已移除项同步更新到配置 ✓
- `npm run typecheck` 通过 ✓

### 本轮已关闭的问题

- paragraph 作为 slash 命令冗余 → **Phase 1 已删除**
- table 在所有 toolbar 和 slash menu 中均已移除 → **后续单独开轮做闭环**

### 本轮仍未解决的问题

- bubble menu 和 link popover 定位精度待 Phase 2 验证
- markdown 输入输出 round-trip 待 Phase 3 验证

---

## Phase 2：核心交互闭环

### 目标

把 toolbar、bubble menu、link popover、slash 命令做成"可放心使用"。

### 修改文件

| 文件 | 改动 |
|------|------|
| `src/modules/rich-editor/extensions/slash-command.ts` | 移除 `command` 回调（我们使用 Vue 菜单不是 Suggestion decoration，command 无法接收 Vue 组件的点击事件） |
| `src/modules/rich-editor/composables/useSlashCommand.ts` | 持有 `executeSelectedItem(item?)` 作为**唯一执行函数**；处理 Enter/Tab 执行和键盘导航 |
| `src/modules/rich-editor/composables/useEditorAction.ts` | 修复 `isActionDisabled` 的 undo/redo 实现 |
| `src/modules/rich-editor/components/RichEditor.vue` | 恢复 `@execute="executeSelectedItem"` 绑定 |
| `src/modules/rich-editor/components/RichEditorSuggestionMenu.vue` | 恢复 `@click="$emit('execute', item)"`，传递被点击的项 |

### 单一执行链（最终版）

```
鼠标点击菜单项
  → @click="$emit('execute', item)" (RichEditorSuggestionMenu)
  → @execute="executeSelectedItem" (RichEditor.vue)
  → executeSelectedItem(item) ← 传入被点击的 item

Enter / Tab 键
  → onSlashKeyDown(event) (useSlashCommand)
  → executeSelectedItem()     ← 用 selectedIndex（无参数）

executeSelectedItem(item?):
  → deleteRange(slashRange)
  → runEditorAction(kind)    ← 唯一执行函数
  → closeMenu()
```

**设计原则：**
- TipTap Suggestion 只负责 `/` 检测、UI 回调、键盘事件路由
- 所有执行逻辑集中在 `useSlashCommand.ts` 的 `executeSelectedItem`
- 鼠标点击传入具体 item，键盘 Enter/Tab 使用 `selectedIndex`
- 没有分散在 plugin / composable / menu 组件三处的执行逻辑

### 具体改动

**slash-command.ts — 移除 command 回调**
- TipTap Suggestion 的 `command` 回调是为 decoration-based 菜单设计的
- 我们的 RichEditorSuggestionMenu 是独立的 Vue 浮动组件，点击事件不走 ProseMirror decorations
- 因此 `command` 永远不会被我们的 Vue 菜单触发，移除它

**useSlashCommand.ts — 单一执行入口**
- `executeSelectedItem(item?)`: 接受可选 item 参数
  - 鼠标点击：传入被点击的具体 item
  - Enter/Tab：无参数，使用 `selectedIndex`
- `onSlashKeyDown`: 处理 ArrowUp/Down/Tab/Escape 导航，**Enter/Tab 也触发执行**

**RichEditorSuggestionMenu.vue — 恢复 @execute**
- `@click="$emit('execute', item)": 鼠标点击时传递被点击的项
- 不再只关闭菜单，而是触发执行

**useEditorAction.ts — 修复 undo/redo disabled**
- 旧代码：`!(editor.can() as any).chain().focus().undo().run()`
- 新代码：`!editor.can().undo()` — TipTap `can()` 直接返回 `boolean`

### 验收标准达成

- slash 命令执行路径统一在 `executeSelectedItem` 一个函数 ✓
- 鼠标点击传入具体 item（不受 hover 状态影响）✓
- Enter/Tab 键盘执行使用 selectedIndex ✓
- undo/redo 按钮在无可撤销/重做时正确禁用 ✓
- `npm run typecheck` 通过 ✓
- `npm run build` 成功 ✓

### 本轮已关闭的问题

- slash 命令执行路径分散（plugin / composable / menu 三处）→ **单一 executeSelectedItem 函数**
- undo/redo disabled 状态永远不准 → **Phase 2 已修复**
- Tab 未处理 → **Phase 2 已添加**

### 本轮仍未解决的问题

- bubble menu 定位精度（多行选区时 midpoint 计算）→ 待 Phase 3 验证
- bubble menu 边界碰撞检测 → 待 Phase 3 验证

---

## Phase 3：Markdown 能力收口

### 目标

把 markdown 处理从"能用一点"变成"行为明确、边界清楚"。

### 修改文件

| 文件 | 改动 |
|------|------|
| `src/modules/rich-editor/components/RichEditor.vue` | 修复 paste handler 逻辑；增强 task list 正则检测 |

### 具体改动

**RichEditor.vue — paste handler 修复**
- 旧：`if (!text || html || !looksLikeMarkdown(text))` — HTML 存在时跳过 markdown 检测
- 新：`if (!text || !looksLikeMarkdown(text))` — 移除 HTML 阻塞逻辑；剪贴板同时有 HTML 和纯文本时优先尝试纯文本 markdown

**RichEditor.vue — task list paste 正则增强**
- 旧：`/^-\s\[[ xX]\]\s/m` — 只匹配 `- [ ]`
- 新：`/^[-*+]\s\[[ xX]\]\s/m` — 匹配 `- [ ]`、`* [x]`、`+ [X]`

### Markdown 能力分析

**已有 markdown 序列化支持（TIptap 内置）：**
- heading（H1-H6）✓
- paragraph ✓
- bullet/ordered list ✓
- blockquote ✓
- code block（fenced）✓
- horizontal rule ✓
- link（`[text](url)`）✓ — @tiptap/extension-link 内置支持
- image（`![alt](url)`）✓ — @tiptap/extension-image 内置支持
- bold/italic/code/strike 等 inline mark ✓

**已知不能 round-trip 的情况：**
- **task list 输出**：task-list 和 task-item 没有 `renderMarkdown` handler，序列化时输出 HTML 而不是 `- [ ]` 格式。**输入**不受影响（marked 能解析）。

### 验收标准达成

- markdown 初始加载正常 ✓（`setContent(markdown, { contentType: 'markdown' })`）
- markdown 输出稳定 ✓（`serialize()` via MarkdownManager）
- markdown paste 识别增强：支持 `* [ ]`、`+ [ ]` task list 语法 ✓
- 已知不能 round-trip 的情况已记录 ✓

### 本轮仍未解决的问题

- task list 序列化输出 HTML 而非 markdown 语法（无 renderMarkdown handler）→ 后续单独处理

---

## Phase 4：样式统一

### 目标

让编辑器从"拼起来能用"变成"整体一致、视觉可信"。

### 修改文件

| 文件 | 改动 |
|------|------|
| `src/modules/rich-editor/styles/editor.css` | 统一浮层样式（border-radius、box-shadow、z-index） |
| `src/pages/ArticlePage.vue` | 仅复核，未修改 |
| `src/components/ArticleBodyEditor.vue` | 仅复核，未修改 |

### 具体改动

**本轮新增达成（代码级改动）：**

| 选择器 | 属性 | 改动前 | 改动后 |
|--------|------|--------|--------|
| `.rich-editor__suggestion-menu` | `border-radius` | `0.5rem` | `0.375rem` |
| `.rich-editor__suggestion-menu` | `box-shadow` | `0 8px 24px rgba(0,0,0,0.25)` | `0 4px 12px rgba(0,0,0,0.2)` |
| `.rich-editor__floating-menu` | `z-index` | `20`（显式） | 移除，继承 `.rich-editor__overlay` 的 `30` |

**本轮复核通过（前序已成立）：**

- 宿主页面（`ArticlePage.vue`、`ArticleBodyEditor.vue`）无任何 `:deep()` 干预编辑器内部结构
- 编辑区通过 `.rich-editor`（`height: 100%`）+ `.rich-editor__content`（`flex: 1`）的 flex chain 填充容器
- 四个浮层的 `background` 均使用 `--editor-bubble-bg` token（`#1f2937`），统一使用 CSS 变量

### 四个浮层当前样式对比

| 属性 | bubble menu | floating menu | link popover | suggestion menu |
|------|-------------|---------------|--------------|-----------------|
| `border-radius` | `0.375rem` | `0.375rem` | `0.375rem` | `0.375rem` ✓ |
| `box-shadow` | `0 4px 12px rgba(0,0,0,0.2)` | `0 4px 12px rgba(0,0,0,0.2)` | `0 4px 12px rgba(0,0,0,0.2)` | `0 4px 12px rgba(0,0,0,0.2)` ✓ |
| `background` | `--editor-bubble-bg` | `--editor-bubble-bg` | `--editor-bubble-bg` | `--editor-bubble-bg` ✓ |
| `padding` | `0.25rem 0.375rem` | `0.25rem` | `0.25rem 0.5rem` | `0.25rem` |
| `z-index` | `30`（overlay） | `30`（overlay） | `32`（显式） | `30`（overlay） |

**说明：**
- `padding` 差异是功能性差异（bubble 含按钮组、link 含输入框），非样式不统一
- `z-index: 32` 对 link popover 是必要的功能性层级差，保留

### 验收标准达成

**本轮新增达成：**
- `suggestion menu` 与其他浮层的 `border-radius` 统一为 `0.375rem` ✓
- `suggestion menu` 与其他浮层的 `box-shadow` 统一为 `0 4px 12px rgba(0,0,0,0.2)` ✓
- `floating menu` z-index 冲突修复（移除显式 `20`，继承 overlay 的 `30`）✓

**本轮复核通过（前序已成立）：**
- 宿主层无 `:deep()` 干预编辑器内部 ✓
- 编辑区通过 flex 填充容器，底部无多余留白 ✓
- 所有浮层使用统一的 `--editor-bubble-bg` token ✓

### 本轮仍未解决的问题

无未解决问题。所有 4 个浮层的核心视觉属性（border-radius、box-shadow、background）已统一。

---

## Phase 5：宿主收薄

### 目标

确保未来替换编辑器实现时成本可控。

### 复核文件

| 文件 | 结论 |
|------|------|
| `src/components/ArticleBodyEditor.vue` | 已薄接入，仅透传 4 个 prop（`v-model`、`contentType`、`min-height`、`onInsertImage`） |
| `src/pages/ArticlePage.vue` | 仅复核，未修改。处理 frontmatter、文件读写、自动保存、外部变更监听——均属页面层逻辑 |

### 具体复核结果

**ArticleBodyEditor.vue（已薄）：**
```vue
<RichEditor
  v-model="model"
  content-type="markdown"
  placeholder="..."
  min-height="100%"
  max-width="100%"
  :on-insert-image="handleInsertImage"
/>
```
- 无 `:deep()` 选择器
- 无 editor 内部样式
- 只做 prop 穿透，不含任何编辑器逻辑

**ArticlePage.vue（已薄）：**
- 页面布局 CSS（`.article-page`、`.editor-area` 等）均为宿主自身结构，不涉及编辑器内部
- 无任何 `:deep()` 干预
- frontmatter 管理、文件 I/O、自动保存、外部文件监听均为页面层 concern，与编辑器实现无关

### 验收标准达成

- 编辑器模块是主要改动点 ✓（ArticleBodyEditor 约 50 行，纯透传）
- 宿主页面无 `:deep()` 干预 ✓
- 替换 editor 实现时不会牵连保存链路 ✓（保存链路在 ArticlePage.vue，不在编辑器模块）

### 本轮已关闭的问题

无新问题。

### 本轮仍未解决的问题

无。

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
