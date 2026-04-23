# 编辑器内容区独立与主题化多阶段任务清单

## 目标

把当前编辑器继续收口为更稳定、更容易换主题的结构，并为后续“文章内容区主题切换”打基础。

这次不是单点修补，而是一次性给出完整推进路线，供其他 AI 分阶段执行。

核心原则：

1. 内容区样式独立
2. 编辑器 UI 样式独立
3. 页面宿主布局独立
4. 内容区优先采用 Tiptap 官方 `.tiptap` 样式思路
5. `slash / bubble / link popover` 参考官方 UI Components 外观，做轻量本地 CSS

---

## 总体结论

### 关于官方样式

Tiptap 官方是 **headless-first**：

- 有官方推荐的内容区样式组织方式
- 有官方 UI Components / Templates 可参考
- **但没有一个适合本项目直接一键启用的官方主题包**

因此本项目正确路线是：

1. 内容区按官方 `.tiptap` 路线整理
2. UI 浮层参考官方组件外观
3. 主题能力自己做，但基于清晰的 CSS 变量和主题 class

---

## 本轮总体约束

执行过程中必须遵守：

1. 不重新引入 `@nuxt/ui`
2. 不恢复 `table` 可见入口
3. 不把样式责任重新推回 `ArticlePage` 的 `:deep(...)`
4. 保持 `ArticleBodyEditor` 是宿主薄包装
5. 保留现有保存逻辑、frontmatter 逻辑、图片插入回调

---

# Phase 1：内容区样式独立

## 目标

把“文章内容区”从当前混合样式中拆出来，单独成为一个可维护、可主题化的样式域。

## 要求

1. 内容区样式只负责：
   - 标题
   - 段落
   - 列表
   - blockquote
   - code block
   - hr
   - link
   - image
   - table
   - task list

2. 内容区样式不要再负责：
   - toolbar
   - bubble menu
   - slash menu
   - link popover
   - 页面布局

## 建议拆分

把当前内容区样式从现有混合文件中抽出来，形成明确结构，例如：

- `src/modules/rich-editor/styles/content/base.css`
- `src/modules/rich-editor/styles/content/themes/default.css`

或者至少先形成：

- `src/modules/rich-editor/styles/content-theme.css`

## 执行要求

1. 统一正文内容根类，推荐围绕 `.tiptap`
2. 保留业务类名时，也要保证 `.tiptap` 是主作用域
3. 正文排版不再依赖 editor chrome 的样式文件

## 修改文件

- `src/modules/rich-editor/components/RichEditor.vue`
- `src/modules/rich-editor/styles/prose.css`
- 新增内容主题文件

## 验收标准

1. 内容区样式已经独立成单独样式层
2. 修改文章排版时，不需要碰 toolbar / popover 样式

---

# Phase 2：编辑器 UI 样式独立

## 目标

把编辑器 chrome 单独整理为一层，不和内容排版混在一起。

## 范围

只负责：

- toolbar
- bubble menu
- slash menu
- link popover
- floating menu

## 要求

1. 这层只处理编辑器 UI 外观
2. 不负责正文排版
3. 不负责页面布局

## 视觉方向

参考 Tiptap 官方 UI Components 的外观：

- 白底或轻量浮层
- 统一圆角
- 统一阴影
- 统一 hover / active / selected
- icon + 简洁文字

## 修改文件

- `src/modules/rich-editor/styles/editor.css`
- `src/modules/rich-editor/components/RichEditorToolbar.vue`
- `src/modules/rich-editor/components/RichEditorBubbleMenu.vue`
- `src/modules/rich-editor/components/RichEditorSuggestionMenu.vue`
- `src/modules/rich-editor/components/RichEditorLinkPopover.vue`

## 验收标准

1. 内容区和 UI chrome 已经样式分层
2. Bubble / Slash / Link Popover 视觉统一

---

# Phase 3：内容区按官方 `.tiptap` 方案重整

## 目标

让文章内容区正式转向 Tiptap 官方推荐的组织方式。

## 官方建议要点

1. 编辑器内容根使用 `.tiptap`
2. 用 `.tiptap p` / `.tiptap h1` 等方式组织内容样式
3. 通过扩展 `HTMLAttributes` 给节点挂自定义 class

## 执行要求

1. 在 `editorProps.attributes.class` 中明确保留 `.tiptap`
2. 必要时给以下节点加 `HTMLAttributes.class`：
   - paragraph
   - heading
   - blockquote
   - code block
   - task list
3. 清掉无意义历史类名依赖

## 修改文件

- `src/modules/rich-editor/components/RichEditor.vue`
- 各扩展配置文件
- 内容区样式文件

## 验收标准

1. 内容区主要由 `.tiptap` 主导
2. 内容区样式结构接近官方推荐方案

---

# Phase 4：滚动层与内容层彻底拆分

## 目标

解决“编辑器铺满但不滚”问题，并保持笔记本式编辑体验。

## 正确体验

1. 编辑区始终占满可用高度
2. 内容少时有完整空白编辑面
3. 空白区域点击可聚焦
4. 内容多时正文区滚动

## 要求

1. 不要让 `.tiptap` 同时充当：
   - 内容画布
   - 滚动容器
2. 增加独立 scroll wrapper
3. `.tiptap` 负责铺满编辑面
4. wrapper 负责滚动

## 重点检查

- `src/pages/ArticlePage.vue`
- `src/components/ArticleBodyEditor.vue`
- `src/modules/rich-editor/components/RichEditor.vue`
- `src/modules/rich-editor/styles/editor.css`
- `src/modules/rich-editor/styles/content*.css`

## 验收标准

1. 内容少时铺满
2. 空白区域可点击聚焦
3. 内容多时滚动稳定

---

# Phase 5：去掉不想要的焦点视觉

## 目标

删除当前不想要的 `:focus-within` 外框/阴影。

## 要求

1. 删除 `.rich-editor:focus-within`
2. 不要替换成另一个弱化版 ring
3. 如有必要，仅保留内容区自身最基本的 `outline: none`

## 修改文件

- `src/modules/rich-editor/styles/editor.css`

## 验收标准

1. 编辑器 focus 后不再出现整块 ring / border 突变

---

# Phase 6：frontmatter-panel 与 editor-shell 关系收口

## 目标

frontmatter-panel 真正作为 `editor-shell` 浮层存在，并且层级合理。

## 要求

1. frontmatter-panel 挂在 `editor-shell`
2. 不参与正文布局
3. 不挤压编辑区
4. 层级高于 editor shell/chrome 的普通层
5. 同时不要不合理地压过所有 editor overlay

## 修改文件

- `src/pages/ArticlePage.vue`

## 验收标准

1. frontmatter-panel 浮空
2. 不挤压正文
3. 层级关系合理

---

# Phase 7：Bubble / Link / Slash 参考官方 UI Components 收口

## 目标

把当前三个最关键的编辑器浮层交互收敛到“官方风格 + 本地简化实现”。

## Bubble Menu

要求：

1. 白色浮层
2. 按钮可点击
3. 视觉简洁
4. 不再像底部黑条

## Link Popover

要求：

1. 参考官方 link popover 的轻量输入结构
2. 支持编辑 / 确认 / 删除
3. 不再是内联黑条

## Slash Menu

要求：

1. 白底
2. 精简为 `icon + title`
3. 不显示啰嗦描述
4. 键盘行为明确

建议键位：

- `ArrowUp / ArrowDown`：导航
- `Enter`：执行
- `Escape`：关闭
- `Tab`：导航或关闭，但必须明确并文档化

## 修改文件

- `src/modules/rich-editor/components/RichEditorBubbleMenu.vue`
- `src/modules/rich-editor/components/RichEditorLinkPopover.vue`
- `src/modules/rich-editor/components/RichEditorSuggestionMenu.vue`
- `src/modules/rich-editor/styles/editor.css`
- 如有需要：`config/suggestion-menu.ts`

## 验收标准

1. 三者视觉统一
2. 行为不回归
3. slash 菜单更简洁

---

# Phase 8：主题化基础设施

## 目标

让后续“切换文章内容主题”变成低成本操作。

## 要求

为内容区建立专门的 CSS 变量层，例如：

- `--editor-content-text`
- `--editor-content-heading`
- `--editor-content-muted`
- `--editor-content-link`
- `--editor-content-code-bg`
- `--editor-content-blockquote-border`
- `--editor-content-table-border`

并让内容主题通过：

1. 变量切换
2. 或主题 class 切换

来完成。

## 推荐结构

例如：

- `src/modules/rich-editor/styles/content/base.css`
- `src/modules/rich-editor/styles/content/themes/default.css`
- `src/modules/rich-editor/styles/content/themes/serif.css`
- `src/modules/rich-editor/styles/content/themes/docs.css`

第一轮至少先完成：

1. `default`
2. 预留第二个主题入口

## 验收标准

1. 内容区颜色/排版已通过变量组织
2. 后续新增主题时，不需要重写 toolbar / slash / 页面布局

---

# 推荐执行顺序

请按下面顺序执行：

1. Phase 1：内容区样式独立
2. Phase 2：编辑器 UI 样式独立
3. Phase 3：内容区 `.tiptap` 收口
4. Phase 4：滚动层与内容层拆分
5. Phase 5：移除焦点 ring
6. Phase 6：frontmatter-panel 层级收口
7. Phase 7：Bubble / Link / Slash 官方风格收口
8. Phase 8：主题化基础设施

原因：

- 先把“内容”和“UI chrome”分层
- 再解决滚动与焦点这类结构性问题
- 最后做视觉统一和主题基础设施

---

## 每一轮交付要求

每一阶段完成后，请交付：

1. 修改文件列表
2. 本阶段完成了什么
3. 仍有哪些已知限制
4. `npm run typecheck` 结果
5. 如有运行，附 `npm run build` 结果

---

## Review 标准

后续 review 时会重点检查：

1. 内容区和 UI 是否真的分层
2. 是否真的转向 `.tiptap` 官方路线
3. 是否解决了“铺满但不滚”
4. 是否删掉 `.rich-editor:focus-within`
5. frontmatter 是否仍然不挤压正文
6. Bubble / Slash / Link 是否更接近官方组件风格
7. 是否没有重新暴露 `table`
8. 是否为后续主题切换打下了真实基础

---

## 参考资料

- [Tiptap Styling the Editor](https://tiptap.dev/docs/editor/getting-started/style-editor)
- [Tiptap Slash Dropdown Menu UI Component](https://tiptap.dev/docs/ui-components/components/slash-dropdown-menu)
- [Tiptap Link Popover UI Component](https://tiptap.dev/docs/ui-components/components/link-popover)
