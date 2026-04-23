# 编辑器官方样式与 UI 收口推进清单

## 目标

基于 Tiptap 官方推荐路线，收口当前编辑器的内容样式与交互浮层：

1. 内容区直接按官方 `.tiptap` / `editorProps.attributes.class` 方案重整
2. `slash / bubble / link popover` 参考官方 UI Components 的结构与外观，做轻量本地 CSS
3. 不再继续追 `editor-demo` 的自定义视觉
4. 不重新引入 `Nuxt UI`

---

## 官方路线结论

根据 Tiptap 官方文档，核心编辑器是 **headless-first**，不自带完整 UI 和样式主题；官方推荐：

1. 用 `.tiptap` 容器作用域编写内容样式
2. 通过 `editorProps.attributes.class` 给编辑器内容根节点挂类
3. 通过扩展的 `HTMLAttributes` 给段落、标题等节点挂自定义类
4. 如需更快落地，可参考官方 **UI Components / Templates** 的源码结构和视觉实现

也就是说：

- 可以用“官方样式思路”
- 可以参考“官方 UI Components 外观”
- **但没有一个可直接一键套用到 Vue 项目的完整官方主题包**

因此本轮正确策略是：

- 内容区按官方 `.tiptap` 路线收口
- 工具栏、bubble、slash、link popover 参考官方 UI Components 视觉做轻量本地实现

---

## 关于“是否可以直接用官方样式主题”

结论：

**可以借鉴官方样式体系和组件外观，但不能指望一个“一键启用的官方主题包”。**

更准确地说：

1. 内容区可以直接采用官方 `.tiptap` 样式组织方式
2. UI Components 可以作为视觉和结构参考
3. 如果你愿意更深度跟随官方路线，可以引入官方 UI Components 的源码思路
4. 但当前 Vue 项目里仍需要本地落地 CSS、token 和少量结构适配

所以这轮目标不是“安装官方主题”，而是：

**把我们自己的编辑器收敛到“官方风格的内容区 + 轻量本地 UI 外观”。**

---

## 约束

本轮执行必须遵守：

1. 不恢复 `table` 可见入口
2. 不重新引入 `@nuxt/ui`
3. 不把页面样式继续堆到 `ArticlePage` 的 `:deep(...)`
4. 保持 `ArticleBodyEditor` 作为宿主薄包装
5. 继续保留当前已能工作的保存链路、frontmatter 逻辑、图片插入回调

---

## Phase A：内容区按官方 `.tiptap` 路线重整

### 目标

让正文内容区的样式结构更接近官方建议，而不是继续混合历史类名和局部补丁。

### 执行项

1. 统一编辑器内容根类名
   - 在 `RichEditor.vue` 中确认 `editorProps.attributes.class` 的根类职责
   - 推荐保留业务类名，同时增加官方风格根类，例如：
     - `tiptap rich-editor__content`

2. 重整内容样式文件
   - 以 `.tiptap` 为主作用域重新整理：
     - 标题
     - 段落
     - 列表
     - blockquote
     - code block
     - hr
     - link
     - image
   - `rich-editor__content` 可以保留，但不要再让它承担太多历史语义

3. 清理焦点样式
   - 删掉 `.rich-editor:focus-within`
   - 内容区只保留必要的 `outline: none`

4. 补节点 class 策略
   - 对常用扩展评估是否通过 `HTMLAttributes.class` 添加明确类名
   - 优先考虑：
     - heading
     - paragraph
     - blockquote
     - code block
     - task list

### 修改文件

- `src/modules/rich-editor/components/RichEditor.vue`
- `src/modules/rich-editor/styles/prose.css`
- `src/modules/rich-editor/styles/editor.css`
- 如有需要：扩展配置文件

### 验收标准

1. 内容区样式主要由 `.tiptap` 作用域驱动
2. 不再依赖宿主页样式干预
3. 焦点 ring 已去除

---

## Phase B：滚动层与内容层重新分工

### 目标

把“内容画布”和“滚动容器”拆开，避免当前既铺满又滚不起来的问题。

### 执行项

1. 给编辑器主体增加明确 scroll wrapper
2. 让 wrapper 负责 `overflow-y: auto`
3. 让 `.tiptap` / `.rich-editor__content` 负责铺满可编辑空白面
4. 打通以下高度链：
   - `editor-shell`
   - `editor-workspace`
   - `editor-canvas`
   - `ArticleBodyEditor`
   - `.rich-editor`
   - scroll wrapper
   - `.tiptap`

### 修改文件

- `src/pages/ArticlePage.vue`
- `src/components/ArticleBodyEditor.vue`
- `src/modules/rich-editor/components/RichEditor.vue`
- `src/modules/rich-editor/styles/editor.css`
- `src/modules/rich-editor/styles/prose.css`

### 验收标准

1. 内容少时，编辑区始终铺满
2. 空白区域点击可聚焦
3. 内容多时，内容区稳定滚动

---

## Phase C：Bubble / Link / Slash 参考官方 UI Components 收口

### 目标

不再追历史 demo 样式，直接向 Tiptap 官方 UI Components 的结构和视觉靠拢。

### 范围

1. Bubble Menu
2. Link Popover
3. Slash Menu

### 执行项

1. 先统一三者的基础 token
   - 白底
   - 圆角
   - 阴影
   - hover
   - selected
   - icon 尺寸
   - padding

2. Bubble Menu
   - 保持白色浮层
   - 按钮点击必须有效
   - 视觉上更接近官方轻量工具条

3. Link Popover
   - 参考官方 popover 的输入框 + 操作按钮结构
   - 不要再像底部黑条
   - 重点是：
     - 编辑链接
     - 删除链接
     - 确认/取消

4. Slash Menu
   - 视觉参考官方 Slash Dropdown Menu
   - 保持精简：
     - icon
     - title
   - 不显示冗长描述
   - 分组如果保留，必须克制

5. 键盘行为保持现状闭环
   - ArrowUp / ArrowDown：导航
   - Enter：执行
   - Escape：关闭
   - Tab：若当前定义为导航或关闭，必须文档化，不要模糊

### 修改文件

- `src/modules/rich-editor/components/RichEditorBubbleMenu.vue`
- `src/modules/rich-editor/components/RichEditorLinkPopover.vue`
- `src/modules/rich-editor/components/RichEditorSuggestionMenu.vue`
- `src/modules/rich-editor/styles/editor.css`
- 如有需要：`config/suggestion-menu.ts`

### 验收标准

1. bubble / link / slash 三者视觉统一
2. slash 菜单更简洁
3. 交互不回归

---

## Phase D：frontmatter 浮层与 editor shell 关系收口

### 目标

frontmatter-panel 继续保持在 `editor-shell` 层，但层级关系要更合理。

### 执行项

1. 确认 `frontmatter-panel` 继续作为 `editor-shell` 浮层
2. 调整其 `z-index`，避免被 editor shell/chrome 压住
3. 同时不要破坏正常的 editor overlay 关系

### 修改文件

- `src/pages/ArticlePage.vue`

### 验收标准

1. frontmatter-panel 浮空
2. 不挤压正文
3. 层级合理，不显得被编辑器压住

---

## 推荐执行顺序

请按这个顺序推进：

1. Phase A：内容区 `.tiptap` 收口
2. Phase B：滚动层与内容层拆分
3. Phase C：bubble / link / slash 官方风格收口
4. Phase D：frontmatter 浮层层级微调

原因：

- 内容区和滚动层是基础
- UI 浮层视觉应建立在稳定的内容区之上
- frontmatter 层级最后收，避免反复调 overlay

---

## 交付要求

执行完成后请交付：

1. 修改文件列表
2. 哪些地方已经改成官方 `.tiptap` 路线
3. 滚动层最终由哪个节点承担
4. bubble / link / slash 哪些地方参考了官方 UI Components 外观
5. 仍然保留了哪些本地适配
6. `npm run typecheck` 结果
7. 如有运行，附 `npm run build` 结果

---

## Review 标准

后续 review 会重点检查：

1. 是否真的把内容区转向 `.tiptap` 主导
2. 是否解决了“编辑区铺满但不滚”的问题
3. 是否删掉 `.rich-editor:focus-within`
4. bubble / link / slash 是否更接近官方组件风格
5. 是否没有重新引入 `table`
6. 是否没有把样式责任重新丢回宿主页

---

## 参考资料

- [Tiptap Styling the Editor](https://tiptap.dev/docs/editor/getting-started/style-editor)
- [Tiptap Slash Dropdown Menu UI Component](https://tiptap.dev/docs/ui-components/components/slash-dropdown-menu)
- [Tiptap Link Popover UI Component](https://tiptap.dev/docs/ui-components/components/link-popover)
