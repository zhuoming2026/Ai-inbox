# 按 Tiptap Simple Editor / UI Components 外观重做 Bubble、Link、Slash 的执行清单

## 目标

把当前编辑器里最影响观感的 3 个浮层交互，统一收敛到更接近 Tiptap 官方 `Simple Editor` / `UI Components` 的视觉和结构。

本轮只关注：

1. Bubble Menu
2. Link Popover
3. Slash Menu

不要求 1:1 复刻官方实现，但要求：

1. 视觉明显更接近官方
2. 结构更简洁
3. 保持当前 Vue 组件架构
4. 不引入 React 组件

---

## 结论先说

### 1. 当前和官网差距大的原因

主要不是 Tiptap 自带样式缺失，而是我们自己的本地样式与结构已经偏离了官方示例。

官方文档明确说明：

- Bubble menu 的 markup 和 styling 是开发者自己决定的
- Tiptap 核心不提供现成的统一主题

所以现在的差距主要来自：

1. 本地 `editor.css` 的自定义浮层样式
2. 本地 toolbar/bubble/link/slash 的结构组织
3. 图标与尺寸体系和官方不一致

### 2. 该怎么做

正确路线不是“找一个官方主题包替换”，而是：

1. 参考官方 `Simple Editor`
2. 参考官方 `UI Components`
3. 在当前 Vue 组件里重做这 3 个浮层的外观和层级

---

## 参考资料

- [Tiptap Custom menus](https://tiptap.dev/docs/editor/getting-started/style-editor/custom-menus)
- [Tiptap Simple Editor template](https://tiptap.dev/docs/ui-components/templates/simple-editor)
- [Tiptap UI Components overview](https://tiptap.dev/docs/ui-components/components/overview)

---

## 本轮约束

执行过程中必须遵守：

1. 不恢复 `table` 可见入口
2. 不重新引入 `@nuxt/ui`
3. 不把样式责任推回 `ArticlePage`
4. 保持现有 Vue 组件结构，不改成 React
5. 保持当前已通过的保存链路、frontmatter 逻辑、图片回调

---

## Phase A：Bubble Menu 重做

### 目标

让 Bubble Menu 的结构和视觉更接近官方轻量工具条，而不是现在这种“自己拼出来的白条”。

### 官方参考方向

Bubble menu 在官方文档里没有强制外观，但官方示例和模板的共同特征是：

1. 尺寸更紧凑
2. 按钮之间更克制
3. 背景和阴影更轻
4. 更像一组浮在选区上的微型工具条

### 执行项

1. 统一 bubble 外层容器尺寸
   - 更小的 padding
   - 更小的 gap
   - 更轻的阴影

2. 统一 bubble 按钮尺寸
   - icon 尺寸、按钮尺寸、hover/active 状态统一

3. 不再直接复用 fixed toolbar 的视觉比例
   - bubble 是独立浮层，不应完全等同 fixed toolbar

4. 确保按钮点击始终有效
   - 保留防失焦处理
   - 保持 editor focus 不被按钮点击打断

### 修改文件

- `src/modules/rich-editor/components/RichEditorBubbleMenu.vue`
- `src/modules/rich-editor/components/RichEditorToolbar.vue`
- `src/modules/rich-editor/styles/editor.css`

### 验收标准

1. Bubble Menu 更像官方轻量浮层
2. 按钮点击全部有效
3. 不再像“把 fixed toolbar 缩小后硬塞上去”

---

## Phase B：Link Popover 重做

### 目标

让 Link Popover 更接近官方 UI Components 中 link popover 的观感和交互方式。

### 官方参考方向

官方 link popover 的核心感觉是：

1. 小而清晰
2. 输入框是主体
3. 操作按钮语义明确
4. 整体像标准 popover，不像 toolbar 延伸物

### 执行项

1. 重整 popover 容器
   - 白底
   - 轻阴影
   - 紧凑圆角

2. 重整输入区布局
   - 输入框成为主视觉
   - 按钮放到辅助位

3. 统一操作按钮
   - 确认
   - 删除/取消
   - 如有打开链接功能，位置也要合理

4. 不要再使用暗色块样式

### 修改文件

- `src/modules/rich-editor/components/RichEditorLinkPopover.vue`
- `src/modules/rich-editor/styles/editor.css`

### 验收标准

1. Link Popover 视觉明显更接近官方组件
2. 不再像“底部黑条”
3. 编辑、确认、移除动作清晰

---

## Phase C：Slash Menu 重做

### 目标

让 Slash Menu 更接近官方 `Slash Dropdown Menu` 的外观与信息密度。

### 官方参考方向

官方 Slash Dropdown Menu 的共同特点：

1. 白底
2. 项目紧凑
3. `icon + title` 为主
4. 内容信息层级清晰
5. hover / selected 状态轻量明确

### 执行项

1. 继续保持精简
   - 每行只保留 `icon + title`
   - 去掉冗长描述

2. 重整菜单宽度与行高
   - 不要太宽
   - 不要像系统弹窗一样厚重

3. 统一 selected / hover 样式
   - 更接近官方轻量列表感

4. 如果保留分组，必须非常克制
   - 默认优先不显示大段分组文案

### 修改文件

- `src/modules/rich-editor/components/RichEditorSuggestionMenu.vue`
- `src/modules/rich-editor/config/suggestion-menu.ts`
- `src/modules/rich-editor/styles/editor.css`

### 验收标准

1. Slash Menu 更接近官方 dropdown 风格
2. 信息密度合适
3. 键盘导航和点击行为不回归

---

## Phase D：统一 3 个浮层的设计 token

### 目标

不要分别手调 3 套浮层，把它们收进同一套视觉 token。

### 建议统一项

1. 背景色
2. 圆角
3. 阴影
4. 边框
5. 项目 hover
6. 项目 selected
7. icon 尺寸
8. 按钮尺寸
9. 字号

### 建议做法

在 `editor.css` 中明确抽出统一变量，例如：

- `--editor-popover-bg`
- `--editor-popover-border`
- `--editor-popover-shadow`
- `--editor-popover-radius`
- `--editor-popover-item-hover`
- `--editor-popover-item-active`

### 验收标准

1. Bubble / Link / Slash 三者视觉明显同属一套系统
2. 不再各自像不同来源的组件

---

## Phase E：图标与密度统一

### 目标

让这些浮层的 icon 视觉密度更接近官方组件，而不是“项目里能显示就行”。

### 执行项

1. 统一 icon 容器尺寸
2. 统一按钮尺寸
3. 统一文字字号
4. 如有必要，调整当前图标映射，避免过重或过轻

### 修改文件

- `src/modules/rich-editor/config/icons.ts`
- `src/modules/rich-editor/components/RichEditorToolbar.vue`
- `src/modules/rich-editor/components/RichEditorSuggestionMenu.vue`
- `src/modules/rich-editor/styles/editor.css`

### 验收标准

1. 图标视觉重量更统一
2. 不再出现某些按钮过大、某些按钮过小

---

## 推荐执行顺序

请按这个顺序做：

1. Phase A：Bubble Menu
2. Phase B：Link Popover
3. Phase C：Slash Menu
4. Phase D：统一 3 个浮层 token
5. Phase E：图标与密度统一

原因：

- Bubble / Link / Slash 先各自接近官方
- 再统一 token
- 最后再统一 icon 和密度

---

## 交付要求

执行完成后请交付：

1. 修改文件列表
2. Bubble / Link / Slash 分别参考了官方哪一类外观
3. 哪些部分仍保留了本地适配
4. `npm run typecheck` 结果
5. 如有运行，附 `npm run build` 结果

---

## Review 标准

后续 review 会重点检查：

1. Bubble Menu 是否明显更接近官方轻量浮层
2. Link Popover 是否不再像暗色条
3. Slash Menu 是否更接近官方 dropdown 风格
4. 三者是否属于同一套视觉系统
5. 点击和键盘行为是否没有回归
