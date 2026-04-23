# 编辑器布局与滚动修正任务单

## 背景

上一轮对编辑器滚动和 `frontmatter-panel` 的修复，理解方向仍然不够准确。

这次要纠正两个核心理解：

1. “提高一层”不是只把 `z-index` 调大，而是把 `frontmatter-panel` 放到 `editor-shell` 这一层的定位上下文中
2. “正文区滚动”不是把编辑器内容变成一个小滚动盒子，而是让编辑器整体像正常笔记应用一样：
   - 始终占满可用高度
   - 内容少时也有完整空白编辑区
   - 点击空白处可聚焦
   - 内容多时内容区再自然滚动

请后续执行者按本任务单理解并修改，不要再只围绕 `z-index` 和某一个 `overflow-y` 做局部修补。

---

## 本轮目标

完成后应达到：

1. `frontmatter-panel` 作为 `editor-shell` 层的浮层存在
2. 编辑器整体始终占满可用空间
3. 空白编辑区可点击聚焦，像普通笔记应用
4. 当内容超出时，编辑内容区自然滚动

---

## 一、frontmatter-panel 的层级修正

### 当前问题

之前的修复只是在现有层级上尝试浮空，用户的真实诉求不是“更高的 z-index”，而是：

**让 `frontmatter-panel` 挂在 `editor-shell` 层，而不是继续依附在 `editor-workspace` 层。**

### 正确目标

`frontmatter-panel` 应该：

1. 相对 `editor-shell` 定位
2. 浮在整个编辑区之上
3. 不参与正文布局流
4. 不挤压 `editor-surface` / `editor-canvas`

### 执行要求

请检查并修改：

- `src/pages/ArticlePage.vue`

优先考虑：

1. 调整 DOM 层级
2. 让 `editor-shell` 成为定位上下文
3. 再配置 `frontmatter-panel` 的绝对定位

### 不要这样做

- 不要只把 `z-index: 3` 改成 `z-index: 10`
- 不要在原有错误层级上继续堆叠修补

### 验收标准

1. `frontmatter-panel` 绑定在 `editor-shell` 层浮空
2. 展开时不挤压正文区域
3. 收起时不留空白占位
4. 移动端也保持同样逻辑

---

## 二、编辑器高度和滚动逻辑修正

### 当前问题

用户希望的是“正常笔记本”的编辑体验，而不是一个高度不稳定的小滚动盒子。

真实需求是：

1. 编辑区始终占满可用空间
2. 内容少时，空白区域仍属于编辑器
3. 点击空白区域可聚焦
4. 内容多时才滚动

这意味着目标不是简单地说：

- “只让 `.rich-editor__content` 滚”

而是要打通整个高度链。

### 正确目标

以下链路必须正确闭合：

- `editor-shell`
- `editor-workspace`
- `editor-surface`
- `editor-canvas`
- `ArticleBodyEditor`
- `.rich-editor`
- `.rich-editor__content`

最终应实现：

1. 编辑器整体撑满可用高度
2. `.rich-editor__content` 至少占满可视编辑区
3. 空白区域是可点击可聚焦的编辑区
4. 内容溢出时由内容区承担滚动

### 执行要求

请检查并修改：

- `src/pages/ArticlePage.vue`
- `src/components/ArticleBodyEditor.vue`
- `src/modules/rich-editor/components/RichEditor.vue`
- `src/modules/rich-editor/styles/editor.css`
- `src/modules/rich-editor/styles/prose.css`

重点检查：

1. 哪些父层需要：
   - `display: flex`
   - `flex: 1`
   - `min-height: 0`
   - `height: 100%`

2. 哪些层应该 `overflow: hidden`
3. 哪一层应该 `overflow-y: auto`
4. 内容层是否需要：
   - `min-height: 100%`
   - 或等价方式保证空白区域铺满

### 关键理解

这轮不是只补一句 `min-height: 0` 就结束。  
要解决的是“内容少时也铺满、内容多时才滚”的笔记应用体验。

### 验收标准

1. 编辑区无论内容多少都占满可用高度
2. 内容少时，空白区域仍可点击聚焦
3. 内容多时，编辑内容区正常滚动
4. 不再出现“`editor-surface` 被撑大，但内容层自己不滚”的问题

---

## 三、建议执行顺序

请按这个顺序做：

1. 先调整 `frontmatter-panel` 到 `editor-shell` 层
2. 再打通编辑器整体高度链
3. 最后再确认内容区滚动层

原因：

- frontmatter 浮层层级关系会影响后面布局判断
- 高度链没打通前，单独调滚动层通常会误判

---

## 四、交付要求

执行完成后，请交付：

1. 修改文件列表
2. `frontmatter-panel` 如何从 `editor-workspace` 提升到 `editor-shell`
3. 编辑器高度链是如何打通的
4. 最终哪个层负责滚动
5. `npm run typecheck` 结果
6. 如有运行，附 `npm run build` 结果

并且请逐条回答下面 4 项是否已达成：

1. `frontmatter-panel` 已挂到 `editor-shell` 层浮空
2. 编辑器整体始终占满可用空间
3. 空白编辑区可以点击聚焦
4. 内容超出时，内容区正常滚动

---

## 五、不要做的事

本轮不要顺手：

1. 不要改 Bubble Menu
2. 不要改 slash 菜单
3. 不要改 markdown 逻辑
4. 不要恢复 `table`
5. 不要顺手重构整个页面

本轮只处理：

- frontmatter-panel 层级
- 编辑器高度与滚动逻辑

---

## 六、Review 标准

后续 review 时会重点检查：

1. `frontmatter-panel` 是否真的改到 `editor-shell` 层
2. 是否还只是“z-index 变大”，而没有真正换层级
3. 编辑器是否真的始终占满可用空间
4. 空白区域是否可点击聚焦
5. 内容过长时是否由正确的内容层承担滚动
