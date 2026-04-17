# 主题切换功能计划：接入 Claude 设计系统

## 目标
在设置页面添加 Claude 风格的主题选项，实现浅色/深色/Claude 三套主题切换。

## 获取设计系统

### 1. Claude 设计系统（getdesign.md/claude/design-md）
- Terracotta 暖色调
- 干净编辑布局
- 适合 AI 聊天界面

### 2. 深色模式（现有 + 优化）
- 保留当前浅色模式
- 优化深色变体

## 实现步骤

### Step 1: 创建主题文件
创建 `src/styles/themes/` 目录：
- `light.css` - 当前浅色模式
- `claude.css` - Claude 风格（暖色调）
- `dark.css` - 深色模式

### Step 2: 修改设置页面
更新 `src/pages/SettingsPage.vue`：
- 添加第三个选项 "Claude" 到主题选择器

### Step 3: 实现主题切换逻辑
1. 在 `App.vue` 或 `main.ts` 添加主题加载逻辑
2. 根据 `settings.theme` 动态加载对应 CSS 文件
3. 使用 CSS 变量覆盖实现主题切换

### Step 4: 更新 DESIGN.md
更新 `DESIGN.md` 记录三套主题规范

## 主题规范

### Light（当前）
```css
--bg-primary: #f5f4ed
--color-primary: #fabb18
--text-primary: #1a1a1a
```

### Claude（参考）
```css
--bg-primary: #fef9f5  /* warm cream */
--color-primary: #c26d47  /* terracotta */
--text-primary: #1a1a1a
```

### Dark
```css
--bg-primary: #1a1a1a
--color-primary: #e89c6a  /* warm accent */
--text-primary: #f5f4ed
```

## 文件修改清单
- 新增: `src/styles/themes/light.css`
- 新增: `src/styles/themes/claude.css`
- 新增: `src/styles/themes/dark.css`
- 修改: `src/pages/SettingsPage.vue`
- 新增: `src/composables/useTheme.ts`（主题切换逻辑）
- 修改: `src/App.vue`（应用主题）
- 修改: `DESIGN.md`（记录主题规范）