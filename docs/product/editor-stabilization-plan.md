# 编辑器收口方案与执行计划

## 背景

当前 `ai-inbox-app` 已经集成了一版可用的富文本编辑器，主观完成度约为 `70 分`：

- 基础正文编辑已可用
- 保存链路、`frontmatter`、页面壳子已打通
- `Nuxt UI` 已从宿主项目中移除

但当前状态仍存在明显问题：

- 有些工具栏/菜单入口未形成完整闭环
- `slash`、`bubble menu`、`link popover` 等交互体验不稳定
- 样式和结构仍受历史迁移过程影响，不够统一
- 继续追 `editor-demo` 的 “完整独立迁移” 成本高、收益不稳定

因此，本方案的目标不是继续追求 `editor-demo` 的 1:1 迁移，而是把当前编辑器收口成一个：

- 不依赖 `Nuxt UI`
- 以 `TipTap` 为核心
- 功能“小而完整”
- 样式统一、易维护
- 宿主页面低耦合

的稳定正文编辑器。

---

## 路线结论

### 采用路线

继续修缮当前方案，目标从 `70 分` 收口到 `85 分`。

### 不采用路线

1. 不再继续以 `editor-demo -> 完整独立模块` 为当前阶段主目标
2. 不再尝试把宿主项目整体切换到 `Nuxt UI`
3. 不再保留“UI 有入口但行为没闭环”的半成品功能

### 核心策略

1. 先做功能减法
2. 再做关键交互闭环
3. 最后统一样式

换句话说：

- 先把没生效的功能入口删掉或禁用
- 再把最核心的编辑体验做完整
- 最后再做视觉统一

---

## 产品目标

本轮收口后，编辑器必须满足：

1. 正文编辑稳定可用
2. 工具栏中的每个入口都真实生效
3. `slash` 命令可用
4. `bubble menu` 和 `link popover` 是真正的浮层交互
5. `markdown` 输入输出可用，且基本 round-trip 可信
6. 宿主页面只做薄接入，不再承担编辑器内部样式定义

---

## 非目标

以下内容不属于本轮目标：

1. AI 写作/润色
2. 协作编辑
3. 上传服务/服务端图片存储
4. drag handle / block drag 排序
5. 追求与 `editor-demo` 完全同款视觉
6. 大规模重构页面壳子或保存机制

---

## 编辑器边界

### 宿主项目负责

- 页面布局
- `frontmatter`
- 保存逻辑
- 自动保存
- 图片插入回调
- 文档读写

### 编辑器模块负责

- 工具栏
- bubble menu
- slash menu
- link popover
- 编辑区排版样式
- 与 `TipTap` 相关的交互逻辑

### 目标结构

宿主层应保持很薄：

- `src/pages/ArticlePage.vue`
- `src/components/ArticleBodyEditor.vue`

编辑器主逻辑集中在：

- `src/modules/rich-editor/*`

---

## 样式策略

本轮样式采用 `TipTap` 官方推荐思路：

1. 以 `.tiptap` / 编辑器根容器作为内容样式作用域
2. 通过扩展的 `HTMLAttributes.class` 为节点添加类名
3. 不要求宿主页面写大量 `:deep(...)`
4. 工具栏、bubble menu、slash menu、link popover 使用模块内部 CSS 统一控制

参考：

- [Tiptap Styling the Editor](https://tiptap.dev/docs/editor/getting-started/style-editor)

### 具体原则

1. 内容区排版统一交给编辑器模块内部样式
2. 宿主页面不再定义编辑器内部边框、内边距、菜单样式
3. 如果某个视觉效果只能依赖宿主修补，优先回收到模块内部

---

## 最小完整功能集

本轮应保留的功能：

1. 标题 `H1/H2/H3`
2. 粗体
3. 斜体
4. 删除线
5. 行内代码
6. 链接
7. 无序列表
8. 有序列表
9. 任务列表
10. 引用
11. 代码块
12. 分割线
13. 图片插入（仅 callback 模式）
14. undo / redo

本轮应移除或禁用的功能：

1. 未闭环的 toolbar item
2. 未闭环的 slash item
3. drag handle
4. 任何看起来可点但实际上不工作或行为不一致的入口

---

## 分阶段执行计划

---

## Phase 0：封板与基线确认

### 目标

把当前实现冻结为可 review 的基线，避免继续边做边漂移。

### 任务

1. 列出当前 `src/modules/rich-editor` 中所有可见入口
2. 标记每个入口的状态：
   - 已闭环
   - 部分可用
   - 无效/未完成
3. 产出一份“保留 / 删除 / 延后”清单

### 验收标准

1. 所有 toolbar item 有明确状态归类
2. 所有 slash item 有明确状态归类
3. 不再存在“我们也不确定它是否应该工作”的入口

---

## Phase 1：功能减法

### 目标

先把假功能和半成品入口去掉，让 UI 只暴露真实能力。

### 任务

1. 清理 toolbar 中未生效或行为不稳定的按钮
2. 清理 bubble menu 中未闭环项
3. 清理 slash menu 中未闭环项
4. 删除或禁用 drag handle 相关入口
5. 对图片、链接、表格等能力做现实范围收口

### 推荐保留动作

- heading-1
- heading-2
- heading-3
- bold
- italic
- strike
- code
- bullet-list
- ordered-list
- task-list
- blockquote
- code-block
- horizontal-rule
- link
- image
- undo
- redo

### 验收标准

1. 页面上已无明显“点了没反应”的入口
2. toolbar / bubble / slash 暴露能力集合基本一致
3. 移除项已同步更新文档和配置

---

## Phase 2：核心交互闭环

### 目标

把最关键的 4 个交互做成“可放心使用”。

### 任务 A：Toolbar 闭环

1. 所有保留按钮必须真实可执行
2. `active` / `disabled` 状态真实反映 editor state
3. `readonly` 时所有编辑动作禁用

### 任务 B：Bubble Menu 闭环

1. 选中文本后显示
2. 浮层跟随选区定位
3. 不再以内联黑条形式出现在页面流中
4. 和固定工具栏的能力基本一致

### 任务 C：Link Popover 闭环

1. 点击链接动作可以打开
2. 可编辑当前链接
3. 可移除当前链接
4. 关闭时状态清理干净

### 任务 D：Slash 闭环

最小命令集：

1. heading-1
2. heading-2
3. heading-3
4. bullet-list
5. ordered-list
6. task-list
7. blockquote
8. code-block
9. horizontal-rule

必须支持：

1. 输入 `/` 弹出
2. 输入关键词过滤
3. 上下键切换
4. Enter 执行
5. Esc 关闭
6. 点击外部关闭
7. 删除 `/` 后关闭

### 验收标准

1. toolbar、bubble、slash 的可用入口全部闭环
2. link popover 不是黑条，而是可用浮层
3. slash 的键盘交互完整可用

---

## Phase 3：Markdown 能力收口

### 目标

把 markdown 处理从“能用一点”变成“行为明确、边界清楚”。

### 任务

1. 明确当前 `contentType='markdown'` 的输入输出路径
2. 验证 `markdown -> editor -> edit -> markdown`
3. 最少支持以下结构：
   - heading
   - paragraph
   - bullet / ordered / task list
   - blockquote
   - code block
   - horizontal rule
   - link
   - image
4. 粘贴 markdown 文本时做最小自动识别

### 验收标准

1. markdown 初始加载正常
2. markdown 输出稳定
3. markdown paste 至少能识别典型语法块
4. 已知不能 round-trip 的情况被明确记录

---

## Phase 4：样式统一

### 目标

让编辑器从“拼起来能用”变成“整体一致、视觉可信”。

### 任务

1. 用模块内部样式统一工具栏、bubble、link、slash
2. 内容区统一排版
3. 让编辑区占满宿主容器，不在底部留空
4. 移除宿主层对编辑器内部结构的样式干预

### 重点文件

1. `src/modules/rich-editor/styles/editor.css`
2. `src/modules/rich-editor/styles/prose.css`
3. `src/modules/rich-editor/styles/theme.css`
4. `src/modules/rich-editor/components/RichEditor.vue`
5. `src/modules/rich-editor/components/RichEditorToolbar.vue`
6. `src/modules/rich-editor/components/RichEditorSuggestionMenu.vue`
7. `src/modules/rich-editor/components/RichEditorBubbleMenu.vue`
8. `src/modules/rich-editor/components/RichEditorLinkPopover.vue`

### 验收标准

1. 编辑区占满容器
2. 内容排版统一
3. 各类浮层风格一致
4. 宿主页面不再依赖大量 `:deep(...)`

---

## Phase 5：宿主收薄

### 目标

确保未来替换编辑器实现时成本可控。

### 任务

1. `ArticlePage.vue` 只负责页面壳子、保存、frontmatter
2. `ArticleBodyEditor.vue` 只负责最薄接入：
   - `v-model`
   - `contentType`
   - `editable`
   - `onInsertImage`
3. 宿主不要再定义编辑器内部结构样式

### 验收标准

1. 编辑器模块是主要改动点
2. 宿主页面改动非常少
3. 后续替换 editor 实现时不会牵连保存链路

---

## 详细执行顺序

建议其他 AI 按下面顺序执行：

1. 盘点全部功能入口
2. 删除/禁用无效入口
3. 修 toolbar 闭环
4. 修 bubble menu 闭环
5. 修 link popover 闭环
6. 修 slash 最小闭环
7. 修 markdown 输入输出和 paste
8. 再统一样式
9. 最后收薄宿主层

这个顺序的原则是：

- 先功能真实
- 再交互完整
- 最后视觉统一

---

## 对其他 AI 的交付要求

每一轮执行后，必须交付：

1. 修改文件列表
2. 本轮修复目标
3. 本轮已关闭的问题
4. 本轮仍未解决的问题
5. `npm run typecheck` 结果
6. 如有必要，`npm run build` 结果

不要只说“已优化”“已完善”，必须说明具体行为变化。

---

## 我这边的 Review 标准

我后续 review 会重点检查：

1. 是否继续保留了无效入口
2. toolbar / bubble / slash 是否行为一致
3. 是否还在宿主页面里堆编辑器样式
4. 是否引入新的运行时或类型错误
5. 文档、配置、实现是否一致
6. `markdown` 行为是否真实而非“看起来支持”

如果某一轮改动只是“更好看”但没有让交互更闭环，我会判定优先级不对。

---

## 给执行者的一句话任务定义

请不要把当前任务理解成“做一个更漂亮的编辑器”，而要理解成：

**把现有编辑器收口成一个小而完整、稳定可信、宿主低耦合的 TipTap 正文编辑器。**

---

## 推荐的第一轮任务

如果要立刻开始，推荐第一轮只做这 4 件事：

1. 删掉无效 toolbar / slash 入口
2. 补齐最小 slash 闭环
3. 把 bubble menu 和 link popover 做成真正浮层
4. 统一模块内部样式入口，减少宿主样式干预

这是最容易从 `70 分` 拉到 `80+` 的一轮。
