# 编辑器功能验收清单

> 用于人工验收当前 `ai-inbox-app` 中正文编辑器的能力状态。
>
> 状态说明：
>
> - `已完成`：当前版本应可直接使用
> - `未完成`：当前版本不应作为可用能力对外承诺
> - `已知限制`：功能基本可用，但存在明确边界或缺口

---

## 一、接入与页面结构

### 已完成

- `ArticlePage` 已接入正文编辑器
- 顶部导航、frontmatter 面板、保存逻辑仍保留在宿主页面
- 编辑器通过 `ArticleBodyEditor.vue` 做薄接入
- 宿主页面没有使用 `:deep()` 干预编辑器内部结构
- 编辑区可以通过 flex 填满宿主容器

### 未完成

- 无

### 已知限制

- 编辑器仍然是宿主项目内模块，不是可独立发布的 npm 包

---

## 二、工具栏（Fixed Toolbar）

### 已完成

- Undo
- Redo
- Heading 1
- Heading 2
- Heading 3
- Bold
- Italic
- Underline
- Strike
- Inline Code
- Bullet List
- Ordered List
- Task List
- Blockquote
- Code Block
- Horizontal Rule
- Link（通过 Link Popover）
- Image（通过 `onInsertImage` callback）

### 未完成

- Table
- Paragraph 独立入口

### 已知限制

- Image 当前是 callback 模式，不包含上传服务
- Link 是 popover 交互，不是“一键直接插入 URL”

---

## 三、Bubble Menu

### 已完成

- 选中文本后显示
- 支持基础文本格式化：
  - Bold
  - Italic
  - Underline
  - Strike
  - Inline Code
- 支持 Link 入口
- 使用浮层形式显示，不再是页面流中的黑条

### 未完成

- 无

### 已知限制

- 多行选区时定位精度可能仍不完美
- 边界碰撞检测没有单独做增强

---

## 四、Floating Menu

### 已完成

- 空白行附近显示快速插入菜单
- 支持：
  - Heading 1
  - Heading 2
  - Heading 3
  - Bullet List
  - Ordered List
  - Task List
  - Blockquote
  - Code Block
  - Horizontal Rule

### 未完成

- Table

### 已知限制

- 定位与层级已统一，但未额外做复杂碰撞处理

---

## 五、Slash Command

### 已完成

- 输入 `/` 可触发 slash 菜单
- 支持根据输入内容过滤
- 支持键盘导航：
  - Arrow Up
  - Arrow Down
  - Tab
  - Escape
- 支持鼠标点击执行
- 支持 Enter 执行当前选中项
- 统一由 `executeSelectedItem()` 执行 slash 命令
- 当前支持的 slash 项：
  - Heading 1
  - Heading 2
  - Heading 3
  - Bullet List
  - Ordered List
  - Task List
  - Blockquote
  - Code Block
  - Horizontal Rule

### 未完成

- Table
- Paragraph 独立 slash 项

### 已知限制

- `Tab` 当前被定义为“执行当前项”，不是纯导航
- slash 菜单是独立 Vue 浮层，不是 TipTap 官方 decoration 菜单

---

## 六、Link Popover

### 已完成

- 可从 toolbar 打开
- 可从 bubble menu 打开
- 可以读取当前选区已有链接
- 可以设置链接
- 可以移除链接
- 可以打开当前链接
- 样式已统一为浮层

### 未完成

- 无

### 已知限制

- 空 selection 时的行为依赖当前编辑器状态，不是完整的“插入链接文本”流程

---

## 七、图片插入

### 已完成

- 工具栏图片入口可触发宿主 `onInsertImage`
- 宿主当前实现为输入 URL
- 返回 URL 后可以插入图片节点

### 未完成

- 本地文件上传
- 服务端图片上传
- 图片替换
- 图片宽度/对齐控制

### 已知限制

- 当前只适合“插入远程图片 URL”场景

---

## 八、Markdown 支持

### 已完成

- 支持 `contentType="markdown"` 初始化
- 支持 markdown 输出
- 支持 markdown paste 的最小识别
- paste 识别支持：
  - heading
  - quote
  - bullet list
  - ordered list
  - task list（`- [ ]` / `* [ ]` / `+ [ ]`）
  - fenced code block
  - link
  - image
  - horizontal rule

### 未完成

- task list 的纯 markdown 序列化输出

### 已知限制

- task list 目前序列化时会输出 HTML，而不是 `- [ ]` markdown 语法
- markdown round-trip 不是 100% 无损格式保真，只能算“主要结构可用”

---

## 九、视觉与样式

### 已完成

- suggestion menu 与其他浮层统一：
  - `border-radius: 0.375rem`
  - `box-shadow: 0 4px 12px rgba(0,0,0,0.2)`
- floating menu 统一继承 overlay 层级
- 四类浮层统一使用 `--editor-bubble-bg`
- 内容区样式集中在编辑器模块内部

### 未完成

- 无明确阻塞项

### 已知限制

- 视觉已经统一到“稳定可用”，但不等于追求某个 demo 的 100% 外观一致

---

## 十、明确不在本轮范围内

这些功能当前不应作为“待你验收的已完成能力”：

- AI 写作/润色
- 协作编辑
- drag handle / block drag 排序
- 表格完整编辑能力
- 图片上传服务
- 独立 npm 包发布能力

---

## 十一、建议你亲自验收的重点项

建议按这个顺序手测：

1. 打开文章页，确认编辑区填满容器，宿主页面没有挤压出异常空白
2. 用 fixed toolbar 测一遍：
   - 标题
   - 加粗/斜体/下划线/删除线
   - 列表
   - 代码块
   - 分割线
   - 链接
   - 图片
3. 选中文本，确认 bubble menu 正常出现并可操作
4. 输入 `/`，测试：
   - 过滤
   - 上下键
   - Enter
   - Tab
   - 鼠标点击
   - Escape
5. 粘贴一段 markdown：
   - 标题
   - 列表
   - 引用
   - 代码块
   - 任务列表
6. 保存后重新打开，观察 markdown 内容是否基本保持结构
7. 特别检查 task list：
   - 编辑态是否正常
   - 输出到文件时是否变成 HTML

---

## 十二、最终结论

当前编辑器可以视为：

- **已完成的正式基线**
- 适合继续在项目中使用
- 但仍有少量已知限制，特别是：
  - task list markdown 输出
  - 表格未纳入
  - 图片仅 URL 插入

如果人工验收通过，建议把后续工作改成“小步迭代”，而不是继续大重构。
