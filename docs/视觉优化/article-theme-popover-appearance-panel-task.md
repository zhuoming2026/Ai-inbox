# 文章页主题浮窗复用外观设置任务清单

## 背景

用户在文章页面点击主题按钮时，希望能一边调整主题，一边直接观察文章页面效果。

当前 `src/pages/ArticlePage.vue` 已经有一个轻量 `theme-popup`，但只包含：

- 主题选择
- 强调色
- 背景
- 前景
- 界面字体

用户期望的最小改动方向不是重新设计一套文章页主题编辑器，而是把设置页里的完整“外观”区域显示出来：

```txt
settings-content
└── panel
    ├── panel-header / panel-title: "外观"
    └── setting-group
        ├── theme-routing-card
        └── appearance-config-card
```

本任务目标是：**用最少代码改动，把 SettingsPage 的外观配置面板抽成可复用组件，并在 ArticlePage 的主题按钮浮窗中展示同一套面板。**

不要做独立 Electron 窗口。第一版只做文章页内浮窗。

---

## 目标效果

完成后应达到：

1. 文章页点击主题按钮，弹出一个较大的外观设置浮窗。
2. 浮窗内展示与设置页“外观”基本一致的内容，至少包含：
   - `theme-routing-card`
   - `appearance-config-card`
3. 用户调整任意外观项时，主题实时应用到当前文章页。
4. 用户调整时不离开文章页，文章正文始终可见。
5. Settings 页仍然保留原来的外观设置能力。
6. 不维护两套重复的外观设置 UI。

---

## 修改范围

优先修改这些文件：

- `src/pages/SettingsPage.vue`
- `src/pages/ArticlePage.vue`

建议新增：

- `src/components/AppearanceSettingsPanel.vue`

如果后续希望更清晰，也可以放到：

- `src/components/settings/AppearanceSettingsPanel.vue`

但第一版不强制新建目录，避免扩大改动。

---

## 实施顺序

### Task 1：从 SettingsPage 抽出外观面板组件

新增组件：

```txt
src/components/AppearanceSettingsPanel.vue
```

把 `SettingsPage.vue` 中 `activeSection === 'appearance'` 对应的主体内容抽出去。

组件应包含这段结构：

```vue
<section class="panel appearance-panel">
  <div class="panel-header">
    <h2 class="panel-title">外观</h2>
  </div>

  <div class="setting-group">
    <div class="theme-routing-card">
      ...
    </div>
  </div>

  <div class="appearance-config-card">
    ...
  </div>
</section>
```

注意：不要把整个 `settings-content`、左侧 sidebar、页面 header 抽进去。只抽“外观 panel”本体。

### Task 2：把外观相关状态和方法一起迁移到组件

`AppearanceSettingsPanel.vue` 需要自己持有或接管 SettingsPage 中外观相关逻辑。

优先迁移这些内容：

- `themeModes`
- `editablePresets`
- `selectedPreset`
- `selectedPresetConfig`
- `systemFonts`
- `monoFonts`
- `selectedPresetConfig` 相关 computed / watch
- `updateAppearance`
- `applySelectedTheme`
- `persistAppearanceSettings`
- `copyAppearanceTheme`
- `resetAppearancePreset`
- `deleteSelectedTheme`
- `triggerAppearanceImport`
- `handleImportTypora`
- 主题源码编辑相关函数，如果 `appearance-config-card` 当前包含源码编辑区，也一并迁移

实现原则：

1. 能保持原逻辑就保持原逻辑。
2. 不要在 ArticlePage 重新实现一份 `localThemeConfig` 编辑逻辑。
3. 组件内部直接读写 `window.electronAPI.getSettings()` / `saveSettings()` 是可以接受的，符合“最小改动”。
4. 如果 SettingsPage 目前已有全局保存按钮，第一版可以继续让外观项沿用现在的实时保存方式，不要引入新的“确认 / 取消”流程。

### Task 3：让 SettingsPage 使用新组件

`SettingsPage.vue` 中原本的：

```vue
<section v-else-if="activeSection === 'appearance'" class="panel">
  ...
</section>
```

替换为：

```vue
<AppearanceSettingsPanel
  v-else-if="activeSection === 'appearance'"
/>
```

如果组件内部仍需要通知 SettingsPage 刷新全局 settings，可以加一个事件：

```vue
<AppearanceSettingsPanel
  v-else-if="activeSection === 'appearance'"
  @saved="loadSettings"
/>
```

但不要为了理想架构大改 SettingsPage。第一版以复用成功为主。

### Task 4：替换 ArticlePage 当前轻量 theme-popup

`ArticlePage.vue` 当前主题按钮附近有：

```vue
<n-popover
  ref="themePopupRef"
  trigger="click"
  placement="bottom-end"
  :width="320"
>
  ...
  <div class="theme-popup">
    ...
  </div>
</n-popover>
```

把浮窗内容替换成：

```vue
<n-popover
  trigger="click"
  placement="bottom-end"
  :width="520"
  scrollable
>
  <template #trigger>
    <button class="theme-btn" type="button" title="主题">
      <n-icon><ColorPaletteOutline /></n-icon>
    </button>
  </template>

  <div class="article-appearance-popover">
    <AppearanceSettingsPanel compact />
  </div>
</n-popover>
```

然后删除 ArticlePage 中旧的局部主题编辑状态，避免两套逻辑共存：

- `themePopupRef`
- `localThemeConfig`
- `localThemeId`
- `editableThemeOptions`
- `systemFonts`
- `loadThemeToPopup`
- `handleThemeSelectChange`
- `applyLocalTheme`

如果这些状态还有别处依赖，要先确认再删。

### Task 5：给 AppearanceSettingsPanel 加 compact 模式

组件增加 prop：

```ts
const props = defineProps<{
  compact?: boolean
}>()
```

根节点加 class：

```vue
<section class="panel appearance-panel" :class="{ 'is-compact': compact }">
```

compact 模式只做布局收缩，不改变功能：

- 浮窗宽度控制在 `520px` 左右。
- 内容最大高度控制在 `calc(100vh - 120px)`。
- 纵向滚动在浮窗内部完成。
- 行布局在窄宽度下不要溢出。
- 不要让浮窗遮住整篇文章。

建议 CSS：

```css
.article-appearance-popover {
  width: min(520px, calc(100vw - 32px));
  max-height: calc(100vh - 120px);
  overflow: auto;
}

.appearance-panel.is-compact {
  padding: 0;
  box-shadow: none;
  background: transparent;
}

.appearance-panel.is-compact .panel-header {
  margin-bottom: 12px;
}

.appearance-panel.is-compact .appearance-row {
  grid-template-columns: 96px minmax(0, 1fr);
}
```

具体 class 要以现有 CSS 为准，不要机械照抄。

### Task 6：保证主题实时生效

文章页本身已经使用：

- `useTheme()`
- CSS variables
- `themeOverrides`
- `ArticleBodyEditor :typography-theme="activeThemeId"`

抽组件后要确认：

1. 外观面板保存 settings 后，会调用现有 `useTheme().applyThemeFromSettings()` 或等效逻辑。
2. ArticlePage 能同步更新 `activeThemeId`。
3. Naive UI 的 `themeOverrides` 能刷新。当前 ArticlePage 通过 `refreshResolvedThemeTokens()` 读取 CSS 变量，需要确认主题变化后会再次调用。

推荐实现思路：

- `AppearanceSettingsPanel` 每次保存 settings 后 emit：

```ts
const emit = defineEmits<{
  saved: []
}>()
```

- ArticlePage 中监听：

```vue
<AppearanceSettingsPanel compact @saved="handleAppearanceSaved" />
```

- ArticlePage 实现：

```ts
async function handleAppearanceSaved() {
  const settings = await window.electronAPI?.getSettings()
  await applyThemeFromSettings(settings)
  refreshResolvedThemeTokens()
  syncArticleThemeFromSettings(settings)
}
```

其中 `syncArticleThemeFromSettings` 可以复用当前 ArticlePage 中已有的初始化主题逻辑，不要复制一大段。

如果已有 watcher 能自动同步，则只保留 `refreshResolvedThemeTokens()` 和必要的 settings reload。

---

## 技术难点与处理建议

### 难点 1：SettingsPage 的外观逻辑太多，抽组件容易漏函数

处理建议：

1. 先把外观模板完整复制进 `AppearanceSettingsPanel.vue`。
2. 编译报错缺什么，就把对应变量、computed、函数、import 迁进去。
3. 迁完后 SettingsPage 只保留非外观设置逻辑。
4. 不要边抽组件边改交互。

这一步目标是“行为完全不变地搬家”。

### 难点 2：样式原来依赖 SettingsPage 的父容器

处理建议：

外观面板用到的样式如果原本写在 `SettingsPage.vue <style scoped>` 里，抽组件后会失效。

可选路线：

1. 最小路线：把外观相关 CSS 一起搬到 `AppearanceSettingsPanel.vue`。
2. 更稳路线：把公共设置样式搬到一个全局 CSS 或非 scoped 文件。

第一版建议选路线 1。只搬外观相关 class：

- `.panel`
- `.panel-header`
- `.panel-title`
- `.setting-group`
- `.theme-routing-card`
- `.theme-routing-header`
- `.appearance-config-card`
- `.appearance-list`
- `.appearance-row`
- `.appearance-label`
- `.appearance-input`
- `.color-input`
- `.color-swatch`
- `.appearance-section-header`
- 外观导入 / Typora 导入弹窗相关样式

搬完后检查 SettingsPage 其它 section 是否仍需要 `.panel` 等基础样式。如果需要，可以保留一份基础样式在 SettingsPage，外观组件内也保留自己的 scoped 样式。第一版允许少量重复基础样式，避免大规模 CSS 重构。

### 难点 3：浮窗里有导入按钮和隐藏 file input

处理建议：

如果 `appearance-config-card` 内包含导入主题、Typora 导入、源码编辑，这些功能通常依赖隐藏 `<input type="file">` 和 modal。

必须一起迁移：

- 隐藏 file input
- 导入预览 modal
- 相关 ref
- 相关 handler

否则会出现按钮可见但点击无反应。

如果第一版想更小，可以在 compact 模式隐藏导入类按钮：

```vue
<button v-if="!compact" ...>导入</button>
<button v-if="!compact" ...>Typora 导入</button>
```

但用户说“把这一整个显示出来”，所以默认建议不隐藏，除非实现成本失控。

### 难点 4：n-popover 宽高和内部滚动

处理建议：

不要让 `n-popover` 无限长，也不要让页面整体滚动。

要保证：

- popover 宽度约 `520px`
- 内部 `.article-appearance-popover` 自己滚动
- `max-height: calc(100vh - 120px)`
- `overflow: auto`

如果 `n-popover` 的 `scrollable` 行为和内部滚动冲突，优先保留内部容器滚动。

### 难点 5：主题变化后文章页没有立刻刷新

处理建议：

每次 `AppearanceSettingsPanel` 保存成功后，统一做三件事：

1. 保存 settings
2. 调用 `applyThemeFromSettings(settings)`
3. emit `saved`

ArticlePage 收到 `saved` 后：

1. 重新读取 settings
2. 更新 `activeThemeId`
3. 调用 `refreshResolvedThemeTokens()`

不要只改 CSS 变量，不更新 `activeThemeId`，否则 `ArticleBodyEditor` 的 `typography-theme` 可能仍是旧值。

---

## 验收标准

### 功能验收

1. Settings 页外观设置仍能打开、编辑、保存。
2. Article 页点击主题按钮后，浮窗展示完整外观设置面板。
3. 在 Article 页浮窗里切换浅色 / 深色 / 系统模式有效。
4. 在 Article 页浮窗里切换浅色场景 / 深色场景有效。
5. 在 Article 页浮窗里修改颜色、字体、文章正文样式后，文章页面立即变化。
6. 关闭浮窗后重新打开，显示的是最新设置。
7. 刷新或重进应用后，设置仍保留。

### 视觉验收

1. 浮窗不遮住整个文章主区域。
2. 浮窗内部可以滚动，页面本身不被撑高。
3. 控件文字不溢出。
4. color input、select、按钮在浮窗里仍然可点击。
5. 文章编辑区仍可正常滚动、输入、保存。

### 回归验收

至少运行：

```bash
npm run build
```

如果项目有 typecheck 脚本，也运行：

```bash
npm run typecheck
```

手动验证：

1. 打开 Settings 页，切到“外观”。
2. 打开任意文章页，点击主题按钮。
3. 在浮窗中修改背景色、标题色、文章字体。
4. 观察文章页即时变化。
5. 回到 Settings 页确认值同步。

---

## 推荐回退方案

如果抽组件后改动过大，允许采用临时最小方案：

1. 不完整抽逻辑，只先抽静态 UI + 外观保存核心。
2. ArticlePage 的浮窗只显示：
   - `theme-routing-card`
   - `appearance-config-card` 中的主要颜色、字体、文章正文项
3. 导入、复制、删除、源码编辑暂时保留在 Settings 页。

但最终方向仍然应回到一个共享组件，避免 ArticlePage 和 SettingsPage 长期维护两套外观 UI。

---

## 不要做的事

1. 不要新做一套 ArticlePage 专用主题表单。
2. 不要把主题调节跳转到 Settings 页。
3. 不要第一版做独立 Electron 设置窗口。
4. 不要把浮窗做成全屏遮罩。
5. 不要只复制 HTML，不迁移保存逻辑。
6. 不要为了抽组件顺手重构整个 SettingsPage。

