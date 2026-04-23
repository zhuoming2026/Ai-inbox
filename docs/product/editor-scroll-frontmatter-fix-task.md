# 编辑器滚动与 Frontmatter 浮层修复任务单

## 背景

上一轮“布局与滚动修正”还没有真正收口，目前确认还有 3 个问题：

1. `.rich-editor:focus-within` 焦点样式还在
2. ProseMirror 内容节点 `.rich-editor__content` 仍同时承担“内容画布”和“滚动容器”两个角色，导致编辑区会铺满但滚不起来
3. `frontmatter-panel` 虽然已经提升到 `editor-shell` 层，但 `z-index` 仍然过低，会输给 editor 自己的 overlay

这轮不要再做局部打补丁，要把“内容画布”和“滚动层”拆清楚。

---

## 本轮目标

完成后必须达到：

1. 去掉 `.rich-editor:focus-within` 的视觉处理
2. 编辑器内容区在内容少时铺满、空白可点击聚焦
3. 编辑器内容区在内容多时可以稳定滚动
4. `frontmatter-panel` 挂在 `editor-shell` 层并且层级高于 editor shell/chrome

---

## 一、移除 focus-within 样式

### 当前问题

`src/modules/rich-editor/styles/editor.css` 中仍然保留了：

- `.rich-editor:focus-within { ... }`

这与当前用户要求不一致。

### 要求

请直接删除这条规则，不要替换成别的弱化版。

### 修改文件

- `src/modules/rich-editor/styles/editor.css`

### 验收标准

1. 编辑器获得焦点后，不再因为 `:focus-within` 出现额外边框或阴影变化

---

## 二、修正编辑器滚动架构

### 当前问题

现在的实现中：

- `.rich-editor__content` 被赋予 `overflow-y: auto`
- 同时在 `RichEditor.vue` 里通过 inline style 给它注入 `min-height: 100%`

这会让同一个节点既像“画布”，又像“滚动层”，行为不稳定。

用户要的体验不是“小滚动盒子”，而是典型笔记应用：

1. 编辑区始终铺满可用高度
2. 内容少时有完整空白可编辑区
3. 点击空白区即可聚焦
4. 内容超出时才滚动

### 正确方向

请把“滚动层”和“可编辑内容节点”拆开。

推荐架构：

1. 外层提供一个明确的 scroll wrapper
2. ProseMirror 内容节点放在 wrapper 内部
3. ProseMirror 内容节点负责“铺满空白编辑面”
4. wrapper 负责 `overflow-y: auto`

也就是说：

- 不要继续让 `.rich-editor__content` 既当画布又当 scroll container

### 执行要求

请检查并修改这些文件：

- `src/modules/rich-editor/components/RichEditor.vue`
- `src/modules/rich-editor/styles/editor.css`
- `src/modules/rich-editor/styles/prose.css`
- `src/components/ArticleBodyEditor.vue`
- 如有必要再检查 `src/pages/ArticlePage.vue`

### 具体要求

1. 给 editor 内容增加一个明确的 scroll wrapper
2. 让 wrapper 成为真正的滚动层
3. 让 `.rich-editor__content` 至少占满 wrapper 可视高度
4. 内容少时，空白区域仍属于可点击聚焦的编辑区
5. 内容多时，由 wrapper 稳定滚动
6. 不要再依赖“同一个节点同时 `min-height: 100%` + `overflow-y: auto`”的方式

### 建议重点检查

1. `.rich-editor`
2. toolbar 下方 editor 主体容器
3. 新增的 scroll wrapper
4. `.rich-editor__content`
5. 父层的 `flex: 1 / min-height: 0 / height: 100% / overflow: hidden`

### 验收标准

1. 内容少时，编辑区仍铺满
2. 空白区域点击可聚焦
3. 内容多时，正文区正常滚动
4. 不再出现“编辑器整体被撑大，但正文自己不滚”的现象

---

## 三、提高 frontmatter-panel 层级

### 当前问题

`frontmatter-panel` 的 DOM 层级已经对了，但样式上仍然使用较低的 `z-index`，当前会输给 editor 的 overlay：

- suggestion menu
- bubble menu
- link popover

### 要求

1. 保持 `frontmatter-panel` 继续挂在 `editor-shell`
2. 把它的层级提高到高于 editor shell/chrome 的普通浮层层级
3. 但要注意和真正的编辑器 overlay 的关系，避免不合理覆盖

这轮不要求你重做 overlay 体系，但至少要让 `frontmatter-panel` 不再明显“层级不够”。

### 修改文件

- `src/pages/ArticlePage.vue`

### 验收标准

1. `frontmatter-panel` 展开时明显浮于 editor shell/chrome 之上
2. 不再因为层级过低而显得压在编辑器下面

---

## 四、不要做的事

本轮不要顺手：

1. 不要改 Bubble Menu 功能
2. 不要改 slash 菜单功能
3. 不要改 markdown 逻辑
4. 不要恢复 `table`
5. 不要大改页面结构

本轮只处理：

- `focus-within` 样式移除
- 滚动层与内容层拆分
- `frontmatter-panel` 层级修正

---

## 五、交付要求

执行完成后请交付：

1. 修改文件列表
2. 滚动层和内容层最终分别由哪些节点承担
3. 为什么新的结构能同时满足“铺满”和“滚动”
4. `frontmatter-panel` 的层级最终如何处理
5. `npm run typecheck` 结果
6. 如有运行，附 `npm run build` 结果

并逐条回答以下是否已达成：

1. `.rich-editor:focus-within` 已彻底移除
2. 滚动层和内容层已拆分
3. 内容少时空白区域可点击聚焦
4. 内容多时正文区正常滚动
5. `frontmatter-panel` 层级已提高
