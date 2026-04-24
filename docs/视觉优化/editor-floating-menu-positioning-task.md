# 编辑器浮层定位优化任务计划

## 背景

当前 rich editor 的 link popover、bubble menu、slash menu 在滚动和靠近编辑器底部时存在定位不稳定问题：

- 用户滚动正文后，浮层可能停留在旧位置，没有持续追随光标或选区。
- 在编辑器底部输入 `/` 时，slash menu 容易出现在可视区域外，导致菜单不可见或被裁切。
- 不同浮层各自处理定位，行为不统一。

本轮目标是建立一套更接近成熟编辑器的浮层定位规则：**浮层以光标或选区作为锚点，自动根据可视空间翻转、避让、限制尺寸，并在滚动时持续追随。**

## 产品规则

### 1. Bubble menu

用于文本选区的格式化工具条。

定位规则：

1. 默认出现在选区正上方。
2. 如果上方空间不足，自动翻到选区下方。
3. 如果左右贴边，自动向可视区域内平移。
4. 用户滚动编辑器内容时，bubble menu 必须追随选区位置。
5. 选区不可见或编辑器失焦时，bubble menu 应隐藏。

推荐 placement：

```ts
placement: 'top'
```

推荐 fallback：

```ts
['bottom', 'top-start', 'top-end', 'bottom-start', 'bottom-end']
```

### 2. Link popover

用于编辑链接地址。

定位规则：

1. 默认出现在链接选区正上方。
2. 如果上方空间不足，自动翻到下方。
3. 如果左右空间不足，自动平移到可视区域内。
4. 滚动编辑器内容时，link popover 必须追随对应链接或当前选区。
5. Link popover 不应变成固定在页面底部或编辑器底部的工具条。

推荐 placement：

```ts
placement: 'top'
```

推荐 fallback：

```ts
['bottom', 'top-start', 'top-end', 'bottom-start', 'bottom-end']
```

### 3. Slash menu

用于 `/` 命令菜单。

定位规则：

1. Slash menu 以当前光标作为锚点。
2. 默认靠光标右侧显示，视觉上接近飞书的命令菜单。
3. 如果光标在编辑器可视区域上半部分，菜单优先出现在光标右下方。
4. 如果光标在编辑器可视区域下半部分，菜单优先出现在光标右上方。
5. 如果右侧空间不足，自动翻到左侧。
6. 如果底部空间不足，自动向上翻。
7. 菜单必须始终保持在 editor 可视区域或 viewport 内，不允许在底部不可见。
8. 滚动编辑器内容时，slash menu 必须追随当前光标位置。

推荐动态 placement：

```ts
const placement = cursorInLowerHalf ? 'top-start' : 'bottom-start'
```

如果后续想更贴近飞书，可以进一步尝试：

```ts
const placement = cursorInLowerHalf ? 'right-end' : 'right-start'
```

但第一版建议使用 `top-start` / `bottom-start`，更容易保证不被底部裁切。

## 技术方案

### 核心选型

使用 Floating UI 作为统一定位系统。

对应能力：

- `computePosition`：根据锚点和浮层元素计算位置。
- `autoUpdate`：滚动、resize、布局变化时自动重新计算。
- `offset`：控制浮层与锚点距离。
- `flip`：空间不足时自动翻转。
- `shift`：防止浮层溢出可视区域。
- `size`：限制菜单高度，避免底部或顶部被裁切。

Tiptap 的 BubbleMenu / FloatingMenu 底层也使用 Floating UI，因此这条路线与官方方向一致。

参考文档：

- https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu
- https://tiptap.dev/docs/editor/extensions/functionality/floatingmenu
- https://floating-ui.com/docs/computeposition

### 锚点策略

不要把浮层锚定到某个固定 DOM 容器。

应该使用 Tiptap / ProseMirror 的光标或选区坐标创建 Floating UI `VirtualElement`：

```ts
const rect = editor.view.coordsAtPos(pos)

const virtualElement = {
  getBoundingClientRect() {
    return new DOMRect(
      rect.left,
      rect.top,
      Math.max(1, rect.right - rect.left),
      Math.max(1, rect.bottom - rect.top),
    )
  },
}
```

这样浮层绑定的是“光标矩形”或“选区矩形”，行为上类似 iOS 中以某个控件或区域作为约束锚点。

### 建议抽象

新增统一 composable 或工具模块，例如：

```txt
src/modules/rich-editor/composables/useEditorFloatingPosition.ts
```

它负责：

1. 根据 editor 和 pos / selection 创建 virtual anchor。
2. 调用 Floating UI 计算坐标。
3. 根据 placement / middleware 处理 flip、shift、offset、size。
4. 绑定 `autoUpdate`，在滚动、resize、layout shift 时重新计算。
5. 在组件卸载或浮层隐藏时清理监听。

建议 API：

```ts
useEditorFloatingPosition({
  editor,
  floatingElement,
  getAnchor,
  placement,
  middleware,
  boundary,
})
```

其中：

- `getAnchor` 返回当前光标或选区的 virtual element。
- `floatingElement` 是菜单 DOM。
- `placement` 支持静态值或根据光标位置动态计算。
- `boundary` 优先使用 editor scroll wrapper，必要时 fallback 到 viewport。

## 实现任务

### 任务 1：梳理当前浮层实现

检查这些文件中的定位逻辑：

- `src/modules/rich-editor/components/RichEditorBubbleMenu.vue`
- `src/modules/rich-editor/components/RichEditorLinkPopover.vue`
- `src/modules/rich-editor/components/RichEditorSuggestionMenu.vue`
- `src/modules/rich-editor/extensions` 或 `src/modules/rich-editor/config` 中 slash suggestion 相关文件
- `src/modules/rich-editor/styles/editor.css`

输出当前每个浮层的：

1. DOM 挂载位置。
2. 定位方式。
3. 是否监听 scroll / resize。
4. 是否使用 Tiptap BubbleMenu / FloatingMenu 官方组件或自定义逻辑。

### 任务 2：建立统一 Floating UI 工具

新增或完善一个通用定位工具。

要求：

1. 支持 virtual element。
2. 支持 `placement`、`offset`、`flip`、`shift`、`size`。
3. 支持滚动时自动更新。
4. 支持清理 `autoUpdate`。
5. 不引入新的重型依赖；如果项目已有 Floating UI，直接复用。

如果项目还没有 `@floating-ui/dom`，优先评估 Tiptap 相关依赖是否已经间接可用。若必须新增依赖，只添加：

```bash
npm install @floating-ui/dom
```

### 任务 3：优化 bubble menu 定位

要求：

1. 使用选区 virtual anchor。
2. 默认 `placement: 'top'`。
3. 使用 `offset(8)`。
4. 使用 `flip()`，fallback 到下方。
5. 使用 `shift({ padding: 8 })`。
6. 滚动 editor 内容时自动重新定位。

推荐配置：

```ts
middleware: [
  offset(8),
  flip({
    fallbackPlacements: ['bottom', 'top-start', 'top-end', 'bottom-start', 'bottom-end'],
  }),
  shift({ padding: 8 }),
]
```

### 任务 4：优化 link popover 定位

要求：

1. 使用当前链接选区或光标位置作为 virtual anchor。
2. 默认 `placement: 'top'`。
3. 空间不足时自动翻到下方。
4. 滚动 editor 内容时自动追随。
5. 不要把 link popover 固定到页面底部或 editor 底部。

推荐配置与 bubble menu 保持一致。

### 任务 5：优化 slash menu 定位

要求：

1. 使用当前 slash query 的 range 起点或当前光标作为 virtual anchor。
2. 根据光标在 editor 可视区域中的位置动态选择 placement。
3. 上半区优先 `bottom-start`。
4. 下半区优先 `top-start`。
5. 使用 `flip()` 和 `shift()` 保证不被裁切。
6. 使用 `size()` 限制最大高度，菜单内容过多时内部滚动。

推荐配置：

```ts
const placement = cursorInLowerHalf ? 'top-start' : 'bottom-start'

middleware: [
  offset({ mainAxis: 8, crossAxis: 4 }),
  flip({
    fallbackPlacements: [
      'bottom-start',
      'top-start',
      'right-start',
      'right-end',
      'left-start',
      'left-end',
    ],
  }),
  shift({ padding: 8 }),
  size({
    padding: 8,
    apply({ availableHeight, elements }) {
      Object.assign(elements.floating.style, {
        maxHeight: `${Math.max(180, availableHeight)}px`,
        overflowY: 'auto',
      })
    },
  }),
]
```

### 任务 6：统一浮层样式边界

在 `src/modules/rich-editor/styles/editor.css` 中确认：

1. 浮层使用 `position: fixed` 或与 Floating UI `strategy` 一致的定位方式。
2. 不要被 `.rich-editor`、`.editor-shell`、`.editor-canvas` 的 `overflow: hidden` 裁切。
3. 如需避免裁切，优先把浮层 append 到 `document.body` 或 editor 外层稳定容器。
4. 浮层 z-index 层级统一，不能被 frontmatter panel 或 toolbar 盖住。

建议统一层级：

```css
.rich-editor__bubble-menu,
.rich-editor__link-popover,
.rich-editor__suggestion-menu {
  z-index: 80;
}
```

如 frontmatter panel 仍为 `z-index: 40`，编辑器浮层应高于它。

## 验收标准

### Bubble menu

1. 选中文字后，bubble menu 出现在选区正上方。
2. 在编辑器顶部选中文字时，如果上方空间不足，bubble menu 自动出现在下方。
3. 滚动正文时，bubble menu 跟随选区位置。
4. 选区接近左右边缘时，bubble menu 不溢出屏幕。

### Link popover

1. 打开链接编辑时，popover 出现在链接或选区正上方。
2. 空间不足时自动翻到下方。
3. 滚动正文时，popover 跟随锚点。
4. 不再出现页面底部黑条式 popover。

### Slash menu

1. 在编辑器上半部分输入 `/`，菜单出现在光标下方附近。
2. 在编辑器下半部分，尤其底部输入 `/`，菜单出现在光标上方附近。
3. 菜单始终可见，不被底部裁切。
4. 光标靠右时，菜单自动向左或向内避让。
5. 滚动正文时，菜单追随光标位置。

## 回归检查

完成后至少执行：

1. `npm run build`
2. 手动测试 bubble menu、link popover、slash menu。
3. 在编辑器顶部、中部、底部分别测试 `/`。
4. 在长文档滚动状态下测试三个浮层是否追随锚点。
5. 在窄屏宽度下测试浮层是否溢出。

## 不要做

1. 不要重写编辑器内容模型。
2. 不要修改 markdown 保存格式。
3. 不要引入大型 UI popover 框架。
4. 不要为三个浮层各写一套完全不同的定位逻辑。
5. 不要用固定 bottom / top 值模拟浮层位置。
