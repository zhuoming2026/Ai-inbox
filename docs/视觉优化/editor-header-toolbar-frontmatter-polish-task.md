# 编辑器局部视觉优化任务清单

## 背景

本轮只做编辑器局部视觉整理，不扩展编辑能力，不重写保存逻辑，不重构 markdown / frontmatter 数据流程。

目标是让 `ArticlePage.vue` 与 `rich-editor` 顶部工具区更紧凑、更稳定，并减少 frontmatter 浮层对正文编辑区的视觉干扰。

主要涉及文件：

- `src/pages/ArticlePage.vue`
- `src/components/ArticleBodyEditor.vue`（仅在需要透传 slot / props 时改）
- `src/modules/rich-editor/components/RichEditorToolbar.vue`
- `src/modules/rich-editor/styles/editor.css`

## 任务 1：标题永远只有一行

### 现状

`ArticlePage.vue` 顶部标题使用 `.header-title`，当前没有明确的一行截断约束。长标题可能撑高 header，影响编辑器主体高度和顶部操作区对齐。

### 要求

1. `.header-title` 必须永远只显示一行。
2. 长标题使用省略号截断。
3. 标题所在的 `.header-main` / `.header-meta` / `.header-title` 链路都要正确设置 `min-width: 0`，避免 flex 子项撑开。
4. header 左侧返回按钮不能被压缩变形。
5. 移动端同样保持一行，不允许标题换行挤压按钮区。

### 建议实现

在 `src/pages/ArticlePage.vue` 中检查并补齐：

```css
.header-main {
  min-width: 0;
}

.back-btn {
  flex: 0 0 auto;
}

.header-meta {
  min-width: 0;
  flex: 1 1 auto;
}

.header-title {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

### 验收标准

1. 超长标题不会让 header 增高。
2. 超长标题不会挤压返回按钮。
3. 桌面端和移动端标题都只占一行。
4. 标题截断后仍然与 header 操作区垂直居中。

## 任务 2：把 `editor-appearance-controls` 放到 `rich-editor__toolbar` 右侧

### 现状

`editor-appearance-controls` 当前位于 `ArticlePage.vue` 的 `.header-actions` 中，和保存、收藏、删除等页面级操作混在一起。它实际属于编辑器显示设置，应该靠近 rich editor 工具栏。

### 要求

1. `editor-appearance-controls` 从页面 header 移出。
2. 它应显示在 `.rich-editor__toolbar` 的最右侧。
3. 左侧保留原有编辑器工具按钮分组。
4. 右侧 appearance controls 不应破坏 toolbar 的高度、换行、滚动和移动端布局。
5. 页面 header 只保留保存状态、保存、Collect / Uncollect / Restore、Delete 等文档级操作。

### 推荐实现方向

优先保持 `ArticleBodyEditor` 仍是薄包装，但允许为 fixed toolbar 增加一个右侧 slot。

建议结构：

1. 在 `RichEditorToolbar.vue` 中为 fixed / floating toolbar 增加内部布局：

```vue
<div class="rich-editor__toolbar-main">
  <!-- 原有 group / separator -->
</div>

<div v-if="$slots.end" class="rich-editor__toolbar-end">
  <slot name="end" />
</div>
```

2. 不要让 bubble toolbar 使用这个右侧 slot。
3. 在 `ArticleBodyEditor.vue` 中接收父级传入的 `toolbar-end` slot，并转交给 `RichEditorToolbar`。
4. 在 `ArticlePage.vue` 中把原来的 `editor-appearance-controls` 移到：

```vue
<ArticleBodyEditor
  v-model="bodyMarkdown"
  :typography-theme="editorTypographyTheme"
  :code-theme="editorCodeTheme"
>
  <template #toolbar-end>
    <div class="editor-appearance-controls">
      ...
    </div>
  </template>
</ArticleBodyEditor>
```

具体 slot 名称可以按现有代码风格调整，但语义要清楚。

### 样式要求

`src/modules/rich-editor/styles/editor.css` 中建议让 toolbar 成为左右布局：

```css
.rich-editor__toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: nowrap;
}

.rich-editor__toolbar-main {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex: 1 1 auto;
  min-width: 0;
  overflow-x: auto;
}

.rich-editor__toolbar-end {
  flex: 0 0 auto;
  margin-left: auto;
  display: flex;
  align-items: center;
}
```

`ArticlePage.vue` 中的 `.editor-appearance-controls` 需要适配 toolbar 尺寸：

1. 高度更贴近 toolbar 控件，不要像 header pill 那么厚。
2. 边框、背景、圆角与 toolbar group 统一。
3. select 高度建议接近 `--editor-control-height`。
4. 控件整体可在窄屏换到第二行或横向滚动，但不能挤压编辑器按钮。

### 移动端要求

1. 小屏下 toolbar 可以换行成两行：第一行工具按钮，第二行 appearance controls。
2. appearance controls 在移动端宽度可为 `100%`。
3. 两个 select 不能溢出屏幕。
4. 不要让页面 header 再承担 appearance controls 的移动端样式。

### 验收标准

1. appearance controls 出现在 rich editor toolbar 最右侧。
2. 页面 header 更干净，只剩页面级动作。
3. toolbar 左侧按钮在桌面端仍然对齐、可点击、active 状态正常。
4. 窄屏下 toolbar 不出现文本重叠、控件溢出或按钮被压扁。
5. 切换正文主题和代码主题仍然生效。

## 任务 3：精简 `frontmatter-panel`

### 现状

`frontmatter-panel` 当前浮在 `editor-shell` 右上角，toggle 中包含：

- `frontmatter-toggle-title`
- `frontmatter-toggle-meta`

其中 `frontmatter-toggle-meta` 会显示收起状态或摘要信息。现在目标是减少浮层宽度和信息量，只保留“文档属性”入口。

### 要求

1. `frontmatter-panel` 只需要显示“文档属性”。
2. 删除或不再渲染 `.frontmatter-toggle-meta`。
3. 面板收起态宽度明显缩小。
4. 展开态仍然可以编辑 frontmatter textarea。
5. 不改变 frontmatter 的解析、保存、错误提示逻辑。

### 建议实现

在 `ArticlePage.vue` 模板中把 toggle 精简为：

```vue
<button class="frontmatter-toggle" type="button" @click="toggleFrontmatterExpanded">
  <span class="frontmatter-toggle-title">文档属性</span>
</button>
```

如果 `frontmatterSummary` 只被这个 meta 使用，检查是否可以删除对应 computed。删除前先用 `rg "frontmatterSummary"` 确认没有其他引用。

### 样式建议

1. 收起态宽度从当前 `min(260px, calc(100% - 36px))` 降到更轻的尺寸，例如 `128px - 160px`。
2. 展开态宽度可以保留在 `300px - 340px`，但不要更宽。
3. toggle 从纵向布局改成单行居中或左右紧凑布局。
4. 减少 toggle padding 和阴影，让它更像轻量属性按钮。
5. `.frontmatter-toggle-meta` 样式若无引用，应删除。

参考方向：

```css
.frontmatter-panel[data-open='false'] {
  width: min(148px, calc(100% - 36px));
}

.frontmatter-toggle {
  min-height: 38px;
  padding: 8px 12px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
}
```

### 验收标准

1. 收起时只看到“文档属性”四个字。
2. 不再出现 `frontmatter-toggle-meta` 文案或摘要。
3. 收起态浮层不明显遮挡编辑器正文。
4. 展开后 textarea 仍然可编辑，保存行为不变。
5. frontmatter 解析错误提示仍然正常显示。

## 回归检查

完成后至少检查：

1. `npm run build`
2. 打开文章页，确认标题、toolbar、frontmatter panel 三处布局正常。
3. 用一个很长的文档标题测试 header 是否单行省略。
4. 切换正文主题和代码主题，确认仍然生效。
5. 展开 / 收起文档属性，确认 frontmatter 内容没有丢失。

## 不要做

1. 不要重写 `ArticlePage.vue` 的保存流程。
2. 不要修改 frontmatter 数据格式。
3. 不要把 appearance controls 做回页面 header。
4. 不要引入新的 UI 依赖。
5. 不要大改 rich editor 的编辑器核心逻辑。
