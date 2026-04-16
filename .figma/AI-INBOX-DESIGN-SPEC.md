# AI-Inbox Design Specification
# AI 可理解的设计规格文档

## 1. 全局设计系统 (Global Design System)

### 1.1 页面尺寸 (Page Dimensions)
```yaml
page:
  width: 1920px
  height: 1780px
  min_width: 1920px
  overflow: hidden
```

### 1.2 色彩系统 (Color Palette)
```yaml
colors:
  # 主色调
  background_primary: "#f5f4ed"    # 米白色主背景
  background_secondary: "#f9f9f9"   # 浅灰卡片背景
  background_white: "#ffffff"       # 纯白卡片

  # 文字色
  text_primary: "#000000"           # 标题/主文字
  text_secondary: "#4a4a4a"        # 正文灰色
  text_tertiary: "#666666"         # 浅灰描述文字
  text_placeholder: "#1a1a1a4d"    # 占位符 (25%透明度)

  # 强调色
  accent_primary: "#fabb18"        # 品牌黄
  accent_secondary: "#7d341c"      # 棕色强调

  # 边框
  border_light: "#1a1a1a0d"        # 浅边框 (5%透明度)
  border_medium: "#3c3c43"          # 中等边框
  shadow: "#00000008"               # 阴影色 (3%透明度)

  # 状态标签色
  tag_ready: "#1aae39"             # 绿色-就绪
  tag_working: "#097fe8"           # 蓝色-进行中
  tag_finished: "#213183"          # 深蓝-已完成
  tag_neutral: "#3c3c43"            # 灰色-默认

  # 透明叠加
  overlay_neoclassicism: "#b5a37833"  # 40%透明度
  overlay_historiography: "#94849a33"  # 40%透明度
```

### 1.3 字体系统 (Typography)
```yaml
fonts:
  # 显示字体 - 品牌标识/大标题
  brand:
    family: "Acme, PingFang SC, Hiragino Sans GB, Microsoft YaHei, SimHei, Arial, Helvetica, sans-serif"
    sizes:
      logo: 36px
      nav_item: 28px
      section_title: 54px

  # 正文字体 - 界面文字/正文
  body:
    family: "Inter, PingFang SC, Hiragino Sans GB, Microsoft YaHei, SimHei, Arial, Helvetica, sans-serif"
    sizes:
      h1: 30px
      h2: 20px
      h3: 18px
      body: 16px
      caption: 14px
      small: 12px
      tag: 10px

  # 衬线字体 - 文章/阅读内容
  serif:
    family: "Newsreader, PingFang SC, Hiragino Sans GB, Microsoft YaHei, SimHei, Arial, Helvetica, sans-serif"
    sizes:
      title: 30px
      subtitle: 20px
      body: 18px
      placeholder: 20px (italic)

  # 代码字体
  mono:
    family: "Source Code Pro, PingFang SC, Hiragino Sans GB, Microsoft YaHei, SimHei, Arial, Helvetica, sans-serif"
    sizes:
      headline: 18px
      body: 14px
      tag: 12px

  # 系统字体
  system:
    family: "SF Pro Text, PingFang SC, Hiragino Sans GB, Microsoft YaHei, SimHei, Arial, Helvetica, sans-serif"
    sizes:
      date_large: 48px
      date_medium: 30px
      weekday: 22px
      number: 20px
```

### 1.4 间距系统 (Spacing System)
```yaml
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  xxxl: 56px

# 组件内边距
padding:
  card: 24px
  button: 8px 32px
  input: 17px 36px
  section: 32px 0px
  container: 43px 46px 47px

# 圆角
border_radius:
  small: 6px
  medium: 12px
  large: 16px
  pill: 9999px
  panel: 38px
```

### 1.5 阴影系统 (Shadow System)
```yaml
shadows:
  card: "0px 4px 4px 0px #00000040"           # 卡片悬浮
  card_hover: "0px 8px 16px 0px #00000040"    # 卡片悬停
  input: "0px 4px 20px 0px #00000008"         # 输入框
  panel: "0px 16px 31px 0px #00000003"        # 面板
```

---

## 2. Main Page (首页) - 2013_294

### 2.1 页面布局结构
```
┌─────────────────────────────────────────────────────────────────┐
│                        MAIN PAGE                                 │
├────────────────────────────────┬────────────────────────────────┤
│                                │                                │
│  ┌──────────────────────────┐  │  ┌────────────────────────────┐ │
│  │  NAV: Logo | Write | Read │  │  │                            │ │
│  │        Search | Bell     │  │  │  ┌──────────────────────┐  │ │
│  └──────────────────────────┘  │  │  │    CALENDAR          │  │ │
│                                 │  │  │    April 10, 2021    │  │ │
│  ┌──────────────────────────┐  │  │  │    Sun Mon Tue ...   │  │ │
│  │  INPUT AREA              │  │  │  └──────────────────────┘  │ │
│  │  ┌────────────────────┐  │  │  │                            │ │
│  │  │ Capture a thought │  │  │  │  ┌──────────────────────┐  │ │
│  │  │ link, or task...  │  │  │  │  │    NOTES             │  │ │
│  │  └────────────────────┘  │  │  │  │  ┌────────────────┐  │  │ │
│  │  [📷] [🔗] [📝]  [Inbox] │  │  │  │  │ ☐ Task 1      │  │  │ │
│  └──────────────────────────┘  │  │  │  │ ☐ Task 2      │  │  │ │
│                                 │  │  │  │ ☐ Task 3      │  │  │ │
│  TODAY ─ ─ ─ ─ ─ ─ ─ ─ ─ ─     │  │  │  └────────────────┘  │  │ │
│  ┌────────┐ ┌────────┐ ┌─────┐  │  │  └──────────────────────┘  │ │
│  │ CARD 1 │ │ CARD 2 │ │CARD3│  │  │                            │ │
│  │ (图+文) │ │ (仅文字) │ │(标签)│  │  └────────────────────────────┘ │
│  └────────┘ └────────┘ └─────┘  │                                │
│                                 │                                │
│  YESTERDAY ─ ─ ─ ─ ─ ─ ─ ─ ─    │                                │
│  ┌────────┐ ┌─────┐ ┌────────┐  │                                │
│  │ CARD 4 │ │CARD5│ │ CARD 6 │  │                                │
│  └────────┘ └─────┘ └────────┘  │                                │
│                                │                                │
└────────────────────────────────┴────────────────────────────────┘
```

### 2.2 组件定义

#### Navigation (导航栏)
```yaml
component: Navigation
layout:
  display: flex
  align_items: center
  justify_content: space-between
  height: 58px
  margin_top: 31px

elements:
  - logo:
      text: "Ai-InboX"
      styles:
        font: brand
        size: 36px
        color: ["#000000", "#fabb18"]  # "X" 用黄色

  - nav_items:
      - text: "Write"
      - text: "Read"
      styles:
        font: brand
        size: 28px
        color: "#000000"

  - search:
      width: 509px
      height: 58px
      border_radius: 18px
      background: "#efefef78"  # 47%透明度
      placeholder: "Search Project ..."
      styles:
        font: Poppins
        size: 16px
        color: "#757575"
        padding: 17px 343px 17px 36px

  - notification:
      icon: bell
      badge: "12" (黄色圆形)
      size: 56px
      border_radius: 49px

  - avatar:
      size: 56px
```

#### InputArea (输入区)
```yaml
component: InputArea
layout:
  margin_top: 32px
  padding_bottom: 48px

card:
  width: 1009px
  border_radius: 16px
  border: 1px solid #1a1a1a0d
  shadow: "0px 4px 20px 0px #00000008"
  background: "#faf9f6"
  padding: 23px

textarea:
  placeholder: "Capture a thought, link, or task..."
  width: 100%
  height: 96px
  padding: 8px 12px 60px
  font: serif (italic)
  size: 20px
  color: "#1a1a1a4d"

actions:
  - attachment_buttons:
      icons: [image, link, text]
      style: 圆形按钮

  - submit_button:
      text: "Inbox"
      border_radius: 9999px
      background: "#1a1a1a"
      color: "#f4f1ea"
      font: body
      size: 16px
      padding: 8px 32px
```

#### ContentCard (内容卡片) - 变体 A
```yaml
component: ContentCard_VariantA
layout:
  display: flex
  flex_direction: column
  border_radius: 12px
  box_shadow: "0px 4px 4px 0px #00000040"
  background: "#ffffff"
  padding: 24px
  width: 324px (with_image) 或 303px (text_only)

variants:
  - with_image:
      image:
        height: 173px
        border_radius: 12px
        background: "#dedede"

  - text_only:
      width: 303px

  - tag_only:
      width: 324px
      tag:
        align_self: stretch
        justify_content: center
        background: "#3c3c43"
        border_radius: 100px
        color: "#ffffff"

content:
  headline:
    width: 128px
    font: mono
    size: 18px
    weight: 500
    color: "#000000"

  description:
    width: 256px
    font: mono
    size: 14px
    color: "#666666"

  tags:
    display: flex
    align_items: center
    border_radius: 100px
    padding: 7px
    colors:
      - "#1aae39" (Ready)
      - "#097fe8" (Working)
      - "#213183" (Finished)

  delete_button:
    position: absolute
    right: 46px
    bottom: 25px
    size: 28px
```

#### SectionHeader (分区标题)
```yaml
component: SectionHeader
layout:
  display: inline-flex
  align_items: center
  margin_top: 48px

elements:
  - title:
      font: brand
      size: 54px
      color: "#000000"

  - dots:
      - black_dot: 5px × 5px
      - gap: 7px
      - 2个点垂直排列
```

#### RightPanel_Calendar (右侧面板-日历)
```yaml
component: RightPanel_Calendar
layout:
  width: 986px (implicit)
  border_radius: 38px 0px 0px 38px
  background: "#f9f9f9"
  padding: 37px 30px 25px 29px

calendar_card:
  border_radius: 34px
  shadow: "0px 16px 31px 0px #00000003"
  background: "#ffffff"
  padding: 52px 10px 53px 11px

date_display:
  - month_year:
      font: system
      size: 30px
      color: "#000000" (70% opacity)
      margin_left: 60px

  - day:
      font: system
      size: 48px
      weight: 700
      color: "#000000"
      margin: 10px 0px 0px 60px

week_view:
  padding: 30px 60px 0px
  min_width: 700px
  height: 124px

  week_column:
    display: inline-flex
    flex_direction: column
    align_items: center
    height: 116px
    row_gap: 20px

    weekday:
      font: system
      size: 22px
      color: "#000000"

    date_number:
      font: system
      size: 20px
      weight: 600

    # 今日高亮 (Friday)
    today:
      font: system
      size: 22px
      weight: 600
      color: "#fabb18"

    # 非当月日期
    other_month:
      opacity: 0.3
```

#### RightPanel_Notes (右侧面板-任务列表)
```yaml
component: RightPanel_Notes
layout:
  margin_top: 42px
  border_radius: 34px
  shadow: "0px 16px 31px 0px #00000003"
  background: "#ffffff"
  padding: 35px 28px 413px 33px

header:
  - title:
      text: "Notes"
      font: brand
      size: 28px

task_list:
  margin_top: 15px
  row_gap: 16px

task_item:
  display: inline-flex
  align_items: center
  justify_content: space-between
  border: 1px solid #fabb18
  border_radius: 12px
  background: "#ffffff"
  padding: 15px
  height: 56px

  checkbox:
    border: 2px solid #9f9f9f
    border_radius: 6px
    size: 24px × 24px

  text:
    font: body
    size: 17px
    weight: 500
    color: "#121212"
```

---

## 3. Content Page (编辑页) - 2024_2246

### 3.1 页面布局结构
```
┌─────────────────────────────────────────────────────────────────┐
│                      CONTENT PAGE                                │
├────────────────────────────────┬────────────────────────────────┤
│                                │  ┌──────────────────────────┐   │
│  Ai-InboX                      │  │                    [×] │   │
│                                │  │                          │   │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │  │  ┌────────────────────┐  │   │
│  ┌──────────────────────────┐  │  │  │ 🔷 AI INSIGHTS    │  │   │
│  │ # AI 早报 2026-03-27      │  │  │  │                  │  │   │
│  │                          │  │  │  │ "This article    │  │   │
│  │ ## 概览                   │  │  │  │ posits that..."  │  │   │
│  │                          │  │  │  │                  │  │   │
│  │ ## 要闻                   │  │  │  │ [NEOCLASSICISM]  │  │   │
│  │                          │  │  │  │ [HISTORIOGRAPHY]  │  │   │
│  │ 谷歌发布 Gemini 3.1...   │  │  │  └────────────────────┘  │   │
│  │                          │  │  │                          │   │
│  │ ## 模型发布               │  │  │  ┌────────────────────┐  │   │
│  │                          │  │  │  │  [图片 192px高]    │  │   │
│  │ Suno 正式推出 v5.5...     │  │  │  │                    │  │   │
│  │                          │  │  │  │  The Architecture  │  │   │
│  │ ## 产品应用               │  │  │  │  of Neoclassical   │  │   │
│  │                          │  │  │  │  Libraries         │  │   │
│  │ ...                       │  │  │  │                    │  │   │
│  └──────────────────────────┘  │  │  │  Neoclassicism in  │  │   │
│                                │  │  │  library...        │  │   │
│                                │  │  │                    │  │   │
│                                │  │  │  ## Spatial Dist.  │  │   │
│                                │  │  │                    │  │   │
│                                │  │  │  | "To build a     │  │   │
│                                │  │  │    library..."    │  │   │
│                                │  │  │                    │  │   │
│                                │  │  └────────────────────┘  │   │
│                                │  │                          │   │
│                                │  │  Raw ◁━━━━━━━━━▷ Preview  │   │
│                                │  └──────────────────────────┘   │
│                                │                                │
└────────────────────────────────┴────────────────────────────────┘
```

### 3.2 组件定义

#### MarkdownEditor (Markdown 编辑器)
```yaml
component: MarkdownEditor
layout:
  width: 780px
  height: 1481px
  overflow: hidden

text:
  font: "Inclusive Sans, body"
  size: 32px
  letter_spacing: 3px
  color: "#000000"
```

#### PreviewPanel (预览面板)
```yaml
component: PreviewPanel
layout:
  width: 986px
  height: 1769px
  border_radius: 38px 0px 0px 38px
  background: "#f9f9f9"

close_button:
  position: absolute
  top: 43px
  right: 46px
  size: 24px × 24px
  margin_left: 859px
```

#### AIInsightsCard (AI 洞察卡片)
```yaml
component: AIInsightsCard
layout:
  width: 827px
  border: 1px solid #1a1a1a0d
  border_radius: 16px
  background: "rgba(228, 225, 217, 40%)"  # 40%透明度
  padding: 23px

header:
  - icon: 13px × 13px 小圆点
  - text: "AI INSIGHTS"
    font: body
    size: 10px
    letter_spacing: 2px
    color: "#7d341c"
    text_transform: uppercase

quote:
  font: body (italic)
  size: 14px
  line_height: 23px
  color: "#1a1a1a"
  opacity: 0.8

tags:
  - tag_1:
      background: "rgba(181, 163, 120, 20%)"
      text: "NEOCLASSICISM"
      border_radius: 9999px
      padding: 4px 12px

  - tag_2:
      background: "rgba(148, 132, 154, 20%)"
      text: "HISTORIOGRAPHY"
      border_radius: 9999px
      padding: 4px 12px

  font: body
  size: 10px
  letter_spacing: 0.5px
  text_transform: uppercase
  color: "#4a4a4a"
```

#### ArticlePreview (文章预览)
```yaml
component: ArticlePreview
layout:
  margin_top: 45px

image:
  width: 827px
  height: 192px
  border_radius: 6px
  opacity: 0.6

title:
  width: 827px
  font: serif
  size: 30px
  line_height: 36px
  color: "#1a1a1a"

paragraph:
  width: 827px
  font: body
  size: 16px
  line_height: 26px
  color: "#4a4a4a"
  margin_top: 24px

subsection_title:
  margin: 24px 0px 0px
  font: serif
  size: 20px
  line_height: 28px
  color: "#1a1a1a"

blockquote:
  border_left: 2px solid rgba(125, 52, 28, 50%)
  padding: 8px 0px 8px 22px
  margin_top: 32px

  quote_text:
    width: 326px
    font: serif (italic)
    size: 18px
    line_height: 28px
    color: "rgba(26, 26, 26, 80%)"

mode_switcher:
  position: absolute
  top: 55px
  left: -174px
  display: flex
  align_items: center
  width: 358px
  height: 35px

  - "Raw":
      font: brand
      size: 28px
      color: "#000000"

  - icon:
      margin_left: 106px
      size: 16px × 20px

  - "Preview":
      margin_left: 77px
      font: brand
      size: 28px
      color: "#000000"
```

---

## 4. 交互状态 (Interaction States)

### 4.1 按钮状态
```yaml
button_states:
  default:
    background: "#1a1a1a"
    color: "#f4f1ea"

  hover:
    background: "#2a2a2a"
    box_shadow: "0px 4px 12px 0px #00000020"

  active:
    background: "#0a0a0a"
    transform: scale(0.98)

  disabled:
    background: "#cccccc"
    color: "#888888"
    cursor: not-allowed
```

### 4.2 卡片状态
```yaml
card_states:
  default:
    box_shadow: "0px 4px 4px 0px #00000040"
    background: "#ffffff"

  hover:
    box_shadow: "0px 8px 16px 0px #00000040"
    transform: translateY(-2px)

  active:
    transform: translateY(0)
    box_shadow: "0px 2px 4px 0px #00000040"
```

### 4.3 输入框状态
```yaml
input_states:
  default:
    border: 1px solid #1a1a1a0d
    background: "#faf9f6"

  focus:
    border: 1px solid #1a1a1a
    box_shadow: "0px 0px 0px 3px rgba(250, 187, 24, 20%)"

  error:
    border: 1px solid #ff4444
    box_shadow: "0px 0px 0px 3px rgba(255, 68, 68, 20%)"

  filled:
    color: "#1a1a1a"
```

---

## 5. 响应式断点 (Responsive Breakpoints)
```yaml
breakpoints:
  desktop_large: 1920px  # 设计基准
  desktop: 1440px
  laptop: 1024px
  tablet: 768px
  mobile: 375px
```

---

## 6. 技术实现映射 (Implementation Mapping)

### 6.1 Vue 组件对应
```yaml
components:
  MainPage: "src/views/Home.vue"
  ContentPage: "src/views/Article.vue"

  Navigation: "src/components/Navigation.vue"
  InputArea: "src/components/InputArea.vue"
  ContentCard: "src/components/Card.vue"
  Calendar: "src/components/Calendar.vue"
  TaskList: "src/components/TaskList.vue"
  StatusTag: "src/components/StatusTag.vue"
```

### 6.2 Pinia Store
```yaml
stores:
  inbox: "src/stores/inbox.ts"
    - items: ContentItem[]
    - filter: { date, status, tags }
    - actions: fetchItems, updateItem, deleteItem

  settings: "src/stores/settings.ts"
    - theme: 'light' | 'dark' | 'system'
    - fontSize: number
```

### 6.3 IPC Channels
```yaml
ipc:
  inbox_list: "inbox:list"
  inbox_read: "inbox:read"
  inbox_write: "inbox:write"
  inbox_update_status: "inbox:update-status"
  inbox_archive: "inbox:archive"
  inbox_delete: "inbox:delete"
```

---

## 7. frontmatter 规范 (Frontmatter Schema)
```yaml
frontmatter:
  type:
    enum: ["note", "todo", "link", "image", "research"]
    required: true

  title:
    type: string
    required: true

  created:
    type: string (YYYY-MM-DD)
    required: true

  updated:
    type: string (YYYY-MM-DD)
    required: true

  tags:
    type: array[string]
    default: []

  source:
    enum: ["app", "mcp"]
    default: "app"

  status:
    enum: ["ready", "working", "finished", "archived", "deleted"]
    default: "ready"

  related:
    type: array[string] (URLs)
    default: []
```

---

## 8. 动画规范 (Animation Specifications)
```yaml
animations:
  card_hover:
    duration: 200ms
    easing: ease-out
    transform: translateY(-2px)

  button_press:
    duration: 100ms
    easing: ease-in
    transform: scale(0.98)

  fade_in:
    duration: 300ms
    easing: ease-in-out
    opacity: 0 → 1

  slide_in:
    duration: 400ms
    easing: cubic-bezier(0.4, 0, 0.2, 1)
    transform: translateX(-20px) → translateX(0)
```

---

## 9. 无障碍规范 (Accessibility)
```yaml
a11y:
  color_contrast:
    - text_primary on background_primary: 15.3:1 ✓
    - text_secondary on background_white: 7.1:1 ✓

  focus_indicators:
    outline: 2px solid #fabb18
    offset: 2px

  keyboard_navigation:
    tab_order: [logo, nav_items, search, input, cards, right_panel]
    skip_links: true
```
