# 编辑器最后收尾任务单

## 背景

当前基于三份文档的执行已经完成大部分工作：

- `editor-official-ui-rebuild-task.md`
- `editor-official-styles-adoption-plan.md`
- `editor-content-theme-roadmap.md`

整体方向已经基本正确，但验收后还剩两个明确的收尾点没有完全做完。

这轮不要再发散，专注把这两个点收干净。

---

## 本轮目标

完成后应达到：

1. Bubble Menu 不再结构上复用 fixed toolbar 的 chrome
2. 内容主题不再只是变量文件，而是具备真实的切换入口

---

## 一、Bubble Menu 脱离 fixed toolbar 基类

### 当前问题

虽然 Bubble Menu 已经变成了白色浮层，按钮点击链也比之前稳定，但它仍然通过共享的 `.rich-editor__toolbar` 基类渲染。

这会带来几个问题：

1. 仍继承 fixed toolbar 的背景/边框/布局假设
2. 很难真正接近 Tiptap Simple Editor / UI Components 那种轻量悬浮工具条
3. 结构上仍然像“缩小版 fixed toolbar”

### 正确目标

Bubble Menu 应该成为一个**独立浮层组件**，而不是共享 fixed toolbar 的视觉基类。

### 执行要求

请重构 Bubble Menu 的结构，使其满足：

1. Bubble 自己有独立容器 class
2. Bubble 自己有独立按钮组/按钮样式
3. 不再依赖 `.rich-editor__toolbar` 的边框和背景
4. fixed toolbar / bubble toolbar 可以继续复用数据结构或按钮逻辑
5. 但不要继续复用同一层“chrome class”

### 建议做法

可以保留：

- `RichEditorToolbar.vue` 中的数据映射逻辑
- 按钮执行逻辑

但应至少做到以下二选一之一：

#### 方案 A

给 `RichEditorToolbar.vue` 做真正独立的 layout 分支：

- `layout === 'fixed'`
- `layout === 'bubble'`
- `layout === 'floating'`

让 `bubble` 不再使用 fixed toolbar 的主样式块。

#### 方案 B

把 Bubble Menu 抽成自己的渲染层：

- `RichEditorBubbleMenu.vue` 自己输出按钮结构
- 只复用执行逻辑

推荐优先方案 A，改动更小。

### 修改文件

- `src/modules/rich-editor/components/RichEditorToolbar.vue`
- `src/modules/rich-editor/components/RichEditorBubbleMenu.vue`
- `src/modules/rich-editor/styles/editor.css`

### 验收标准

1. Bubble Menu 不再继承 fixed toolbar 的边框/背景
2. Bubble Menu 视觉上更像独立的轻量浮层
3. 按钮点击行为不回归

---

## 二、给内容主题加真实切换入口

### 当前问题

内容区 CSS 已经独立，变量层也已经抽出来，但主题切换还只是“静态准备”：

1. 变量挂在 `:root` / `.dark`
2. 注释写了可以通过 `.content-theme` 切换
3. 但代码里并没有真正渲染任何 content theme class / attribute
4. 也没有 `RichEditor` prop 或宿主入口来指定主题

这意味着：

- 内容样式独立已完成
- 但“后续低成本切换主题”还没真正打通

### 正确目标

本轮不要求做完整 UI 切换器，但至少要把“可切换架构”接通。

### 执行要求

请给 `RichEditor` 增加一个真实可用的内容主题入口。

推荐最小方案：

1. 给 `RichEditor` 增加一个新 prop，例如：
   - `contentTheme?: 'default' | 'serif' | 'docs'`

2. 在编辑器根节点上渲染主题选择器，例如任选其一：
   - `data-content-theme="default"`
   - `class="content-theme-default"`

3. 把 `default.css` 中的变量作用域从全局 `:root` 改成主题选择器作用域

4. 保留 dark mode 支持，但不要让内容主题只能靠 `.dark` 生效

5. 至少补一个第二主题的空壳或示例主题，例如：
   - `serif`
   - `docs`

### 建议做法

推荐结构：

- `content/themes/default.css`
- `content/themes/serif.css`

并通过：

- `[data-content-theme='default']`
- `[data-content-theme='serif']`

来切换变量。

### 修改文件

- `src/modules/rich-editor/types/editor.ts`
- `src/modules/rich-editor/components/RichEditor.vue`
- `src/modules/rich-editor/styles/content/themes/default.css`
- 如有新增：`src/modules/rich-editor/styles/content/themes/serif.css`
- 如需要宿主演示：`src/components/ArticleBodyEditor.vue`

### 验收标准

1. `RichEditor` 已有真实的 `contentTheme` 输入入口
2. 主题通过 class 或 data-attribute 真实切换
3. 不需要改 import 才能切换主题
4. 至少存在两个主题入口（哪怕第二个只是轻量示例）

---

## 三、本轮不要做的事

这轮不要顺手：

1. 不要重做 slash 执行逻辑
2. 不要重做 markdown 流程
3. 不要恢复 `table`
4. 不要改 frontmatter 逻辑
5. 不要大改页面布局

本轮只处理：

- Bubble Menu 结构独立
- 内容主题切换入口

---

## 四、交付要求

执行完成后请交付：

1. 修改文件列表
2. Bubble Menu 如何脱离 fixed toolbar 基类
3. 内容主题切换入口最终如何设计
4. 第二主题示例是否已提供
5. `npm run typecheck` 结果
6. 如有运行，附 `npm run build` 结果

---

## 五、Review 标准

后续 review 会重点检查：

1. Bubble Menu 是否真正不再继承 fixed toolbar chrome
2. Bubble 是否更接近官方轻量浮层
3. 内容主题是否已经具备真实切换入口
4. 是否不需要改 import 就能切换内容主题
5. 改动是否没有破坏当前编辑器交互
