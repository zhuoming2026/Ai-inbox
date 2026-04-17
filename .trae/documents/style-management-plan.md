# 样式管理增强计划

## 任务概述
将所有硬编码的颜色、字体、间距抽离到 theme.css 中，建立统一的样式系统。

## 当前问题分析

### 1. 硬编码颜色问题
**ArticlePage.vue:**
- `#f5f4ed` - 页面背景 (应使用 `--bg-primary`)
- `#ffffff` - header 背景 (应使用 `--bg-card`)
- `rgba(26, 26, 26, 0.08)` - 边框色 (应使用 `--border-color`)
- `#1a1a1a` - 文本色 (应使用 `--text-primary`)
- `#fabb18` - 强调色 (应使用 `--color-primary`)
- `#fafaf8` - 面板标签背景 (应新增变量)
- `'Newsreader', serif` - 编辑器字体 (应使用 `--font-editor`)

**HomePage.vue (themeOverrides):**
- `'#fabb18'` - primaryColor
- `'#ffffff'` - Card color
- `'0px 4px 4px rgba(0, 0, 0, 0.25)'` - Card boxShadow (应使用 `--shadow-card`)
- `'rgba(239, 239, 239, 0.47)'` - Input color
- `'rgba(250, 187, 24, 0.1)'` - 今日高亮背景

**WeekCalendar.vue:**
- `#ffffff` - 关闭按钮颜色 (应使用 `--text-inverse`)

**CardList.vue:**
- `'white'` - 激活状态文本 (应使用 `--text-inverse`)

### 2. 缺失的 CSS 变量
根据设计规范，需要新增：
- `--text-inverse` - 反色文本（如白底黑字）
- `--bg-label` - 标签/面板头部背景
- `--font-editor` - 编辑器专用字体
- `--font-heading-alt` - 备用标题字体
- 语义化状态颜色

## 实施步骤

### Step 1: 创建统一的 theme.css
- 建立完整的 CSS 变量系统
- 按照 Claude 设计规范的命名规范
- 包含所有必要的颜色、字体、间距、阴影、圆角

### Step 2: 更新各主题文件
- `src/styles/themes/claude.css`
- `src/styles/themes/light.css`
- `src/styles/themes/dark.css`
- 确保三个主题都有对应的变量定义

### Step 3: 修复 ArticlePage.vue
- 替换所有硬编码颜色为 CSS 变量
- 使用统一的字体变量

### Step 4: 修复 HomePage.vue
- 将 themeOverrides 中的硬编码值抽取为变量
- 使用 CSS 变量替代内联样式

### Step 5: 修复其他组件
- WeekCalendar.vue
- CardList.vue
- SettingsPage.vue

### Step 6: 验证
- 确保所有主题切换正常
- 检查是否有遗漏的硬编码值

## 目标文件结构
```
src/styles/
├── theme.css          # 核心变量定义 + 基础组件样式
├── tailwind.css       # Tailwind 入口
└── themes/
    ├── claude.css     # Claude 主题
    ├── light.css      # 浅色主题
    └── dark.css       # 深色主题
```
