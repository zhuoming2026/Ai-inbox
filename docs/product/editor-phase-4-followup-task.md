# Phase 4 补充交付任务单

## 目的

当前 Phase 4 提交了部分样式统一改动，但从 review 角度看，**交付证据不足**，还不能正式判定 “Phase 4 完成”。

本任务单的目标不是继续大改样式，而是把 **Phase 4 的真实交付补齐并文档化**，让后续 review 可以基于明确证据判断是否达标。

---

## 当前问题

目前已观察到的真实代码变化主要集中在：

- `src/modules/rich-editor/styles/editor.css`
  - `floating menu` 去掉显式 `z-index: 20`
  - `suggestion menu` 的 `border-radius` / `box-shadow` 有统一调整

但下面这些点仍缺少足够证据：

1. Phase 4 执行日志没有写入 `editor-stabilization-execution-log.md`
2. “统一浮层样式”还没有以文件级、选择器级方式说明清楚
3. “哪些是本轮新增达成，哪些是之前已存在”没有区分
4. “宿主页面无 `:deep()` 干预”“编辑区 flex 填充容器”等项缺少本轮交付说明

---

## 本轮任务目标

补齐 Phase 4 的**交付说明 + 验收证据**，并在必要时补足少量样式统一改动。

重点是：

1. 让日志与真实代码一致
2. 让每个完成项都有代码依据
3. 如果有未完成项，就明确写成未完成，不要在表格里直接打勾

---

## 必做项

### 1. 在执行日志中补写完整的 Phase 4

请更新：

- `docs/product/editor-stabilization-execution-log.md`

必须新增一个完整的 `## Phase 4：样式统一` 小节，结构至少包括：

1. 目标
2. 修改文件
3. 具体改动
4. 验收标准达成
5. 本轮已关闭的问题
6. 本轮仍未解决的问题

不要只写“已完成”，必须写清楚每条结论对应的代码位置或样式变化。

---

### 2. 区分“本轮新增达成”与“之前已存在”

如果某项检查本来在前几轮就已经成立，例如：

- 宿主页面没有 `:deep()`
- 编辑器通过 flex 填充容器

那么在 Phase 4 日志中必须明确写：

- 这是“延续前一状态”
- 不是“本轮新改出来的”

推荐写法：

- `宿主页面无 :deep() 干预：延续前序状态，本轮复核通过`
- `编辑区 flex 填充容器：延续前序布局，本轮未新增修改`

不要把“本轮没改但仍然成立”的状态写成“本轮已完成的新交付”。

---

### 3. 浮层样式统一必须明确列出覆盖范围

请明确检查并说明以下 4 个浮层/菜单是否真的统一了样式：

1. `bubble menu`
2. `floating menu`
3. `link popover`
4. `suggestion menu`

至少要说明这些视觉维度：

1. `border-radius`
2. `box-shadow`
3. `background`
4. `padding`
5. `z-index` 层级关系

如果某几个组件还没有完全统一，请不要强行写成全部完成，而要写成：

- 已统一哪些
- 哪些仍待补齐

---

### 4. 核对并补足少量缺失样式（如果确实没统一）

如果在核对中发现只有 `suggestion menu` 改了，而其他浮层没有一起对齐，那么请补足最小改动，让样式真正统一。

重点文件：

1. `src/modules/rich-editor/styles/editor.css`
2. 如有必要，再检查：
   - `src/modules/rich-editor/styles/theme.css`
   - `src/modules/rich-editor/styles/prose.css`

原则：

- 只做最小必要样式统一
- 不要顺手大改视觉
- 不要引入新的布局逻辑

---

### 5. 复核宿主层是否仍保持“薄”

请检查：

1. `src/pages/ArticlePage.vue`
2. `src/components/ArticleBodyEditor.vue`

确认：

- 没有新加 `:deep()`
- 没有重新把编辑器内部样式塞回宿主层
- 宿主仍然只负责布局和接线

如果没有变化，也请在 Phase 4 日志里写明“已复核，无新增宿主干预”。

---

## 推荐输出格式

请在 `editor-stabilization-execution-log.md` 的 Phase 4 中至少包含这些内容：

### 修改文件

- `src/modules/rich-editor/styles/editor.css`
- `src/pages/ArticlePage.vue`（如仅复核，可注明“未改，仅确认”）
- `src/components/ArticleBodyEditor.vue`（如仅复核，可注明“未改，仅确认”）

### 具体改动

示例格式：

- `suggestion menu`：`border-radius` 从 `0.5rem` 调整为 `0.375rem`
- `suggestion menu`：`box-shadow` 从 `0 8px 24px rgba(...)` 调整为 `0 4px 12px rgba(...)`
- `floating menu`：移除显式 `z-index: 20`，统一继承 `.rich-editor__overlay`
- `bubble menu`：已复核，与其他浮层风格一致 / 或仍存在差异
- `link popover`：已复核，与其他浮层风格一致 / 或仍存在差异

### 验收标准达成

请分成两类写：

1. 本轮新增达成
2. 本轮复核通过（前序已成立）

示例：

- 本轮新增达成：`suggestion menu` 与 `floating menu` 的圆角/阴影统一
- 本轮复核通过：宿主层无 `:deep()` 干预
- 本轮复核通过：编辑区仍通过 flex 填充容器

---

## 不要做的事

这轮不要顺手做以下内容：

1. 不要开始 Phase 5
2. 不要补 Markdown 新能力
3. 不要修改 slash 逻辑
4. 不要大改视觉方向
5. 不要为了“看起来完成”而写夸大日志

这轮的重点是：

- 补交付证据
- 对齐日志和代码
- 必要时补齐少量样式统一

---

## 验收标准

本轮完成后，应满足：

1. `editor-stabilization-execution-log.md` 中新增完整的 Phase 4 小节
2. 每条完成项都能在代码里找到对应依据
3. “本轮新增达成”与“前序已成立、仅复核”被清楚区分
4. 如果浮层样式尚未完全统一，日志必须真实写出差异
5. 宿主层仍然保持薄，不重新介入编辑器内部样式

---

## 交付物

请最终交付：

1. 更新后的 `docs/product/editor-stabilization-execution-log.md`
2. 如有必要，更新后的编辑器样式文件
3. 一段简短说明：
   - Phase 4 这轮到底新增完成了什么
   - 哪些只是复核通过
   - 还有哪些样式问题仍未解决
