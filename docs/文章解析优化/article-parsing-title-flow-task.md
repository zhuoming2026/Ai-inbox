# 文章解析与标题流转优化任务清单

## 背景

当前文章页的标题主要来自 frontmatter 的 `title` 字段，编辑区只编辑 body，因此新文章打开后经常直接从 `## Content` 开始。这个结构更像内部存储格式，不像一篇可直接阅读和继续编辑的 markdown 文章。

本轮目标是把文章数据流调整为：

> 输入先完整保存在正文 raw 中，标题从正文单向派生到文章属性；AI 解析结果也明确写回正文，而不是只藏在属性里。

## 核心目标

1. 新文章正文不再以 `## Content` 作为默认开头。
2. 正文中应该有自然的一级标题 `# ...`。
3. 原始输入必须保留在 `## 原文` 区块。
4. AI 成功解析后，把总结写入 `## AI 总结` 区块。
5. 标题展示优先级清晰：`aiTitle > contentTitle > fallbackTitle > slug`。
6. 正文标题可以影响文章属性；直接修改文章属性不反向改正文。

## 建议文档结构

AI 成功时：

```md
---
type: "link"
title: "《GPT-5.5 全解析｜OpenAI 最新最强模型 13 分钟看完 + 6 张可视化跑分图》"
contentTitle: "待阅读 https://www.bilibili.com/video/BV1rZogBkEzd"
aiTitle: "《GPT-5.5 全解析｜OpenAI 最新最强模型 13 分钟看完 + 6 张可视化跑分图》"
titleSource: "ai"
created: "2026-04-24"
updated: "2026-04-24"
tags: ["link"]
source: "app"
bucket: "inbox"
parseMode: "deterministic"
enrichStatus: "success"
aiProvider: "openai"
rawInputType: "text"
---

# 《GPT-5.5 全解析｜OpenAI 最新最强模型 13 分钟看完 + 6 张可视化跑分图》

## AI 总结

这是一个关于 GPT-5.5 的解析视频。提取到内容是：

音频内容提炼

--

## 原文

待阅读 https://www.bilibili.com/video/BV1rZogBkEzd
```

AI 失败或未启用时：

```md
---
type: "link"
title: "待阅读 https://www.bilibili.com/video/BV1rZogBkEzd"
contentTitle: "待阅读 https://www.bilibili.com/video/BV1rZogBkEzd"
aiTitle: ""
titleSource: "content"
created: "2026-04-24"
updated: "2026-04-24"
tags: ["link"]
source: "app"
bucket: "inbox"
parseMode: "deterministic"
enrichStatus: "none"
aiProvider: "none"
rawInputType: "text"
---

# 待阅读 https://www.bilibili.com/video/BV1rZogBkEzd

## 原文

待阅读 https://www.bilibili.com/video/BV1rZogBkEzd
```

## 标题字段规则

### 字段含义

- `contentTitle`：从正文 H1 或正文第一条有意义文本派生出来的标题。
- `aiTitle`：AI 解析出的标题。AI 未成功时为空字符串或不存在。
- `title`：最终展示标题，用于首页卡片、文章页顶部标题、搜索。
- `titleSource`：记录当前 `title` 的来源，可选值为 `ai | content | fallback | manual`。

### 展示优先级

```ts
displayTitle = aiTitle || contentTitle || fallbackTitle || slug
```

### 单向同步规则

1. 创建文档时，从原始输入提取 `contentTitle`，并写入正文 H1。
2. 用户在正文中修改 H1 后，保存时可以同步更新 `contentTitle`。
3. 如果没有 `aiTitle`，`title` 同步为 `contentTitle`。
4. 如果有 `aiTitle`，`title` 优先使用 `aiTitle`。
5. 用户直接编辑 frontmatter 中的 `title` 时，视为属性层修改，不自动修改正文 H1。
6. 如需支持手动固定标题，后续可引入 `titleSource: manual`，本轮不强制实现 UI。

## 任务清单

### 任务 1：梳理并移除默认 `## Content` 写入

涉及区域：

- `src/shared/input-pipeline.ts`
- `src/shared/inbox-document.ts`
- 相关测试或调用方

要求：

1. 新建 note / research / link / image 文档时，不再默认生成 `## Content`。
2. 新文档正文第一段应从 `# 标题` 开始。
3. 原始输入统一放入 `## 原文` 区块。
4. 保留 todo 月度聚合的现有行为，todo 可以暂不纳入本轮文章化改造。

验收：

- 普通文本输入后，正文结构为 `# 标题 + ## 原文`。
- URL 输入后，正文结构为 `# 标题 + ## 原文`。
- 页面中不再出现新生成的 `## Content`。

### 任务 2：新增标题提取工具函数

建议新增或扩展：

- `extractMarkdownH1(body: string): string`
- `extractFirstMeaningfulLine(text: string): string`
- `deriveContentTitle(rawInput: string, body?: string): string`
- `resolveDisplayTitle(frontmatter, body, slug): string`

规则：

1. 如果正文第一处一级标题是 `# xxx`，使用 `xxx`。
2. 如果没有 H1，使用第一条非空、非 markdown 分隔符、非纯 URL 的有意义文本。
3. 如果仍为空，使用 slug。
4. 标题长度可先限制在 80 字以内，避免首页卡片过长。

验收：

- markdown 粘贴包含 H1 时，标题取 H1。
- markdown 粘贴没有 H1 时，标题取第一行有效文本。
- 纯 URL 输入时，标题 fallback 可以先用原始输入或域名，后续再补链接解析。

### 任务 3：创建文档时写入标题字段

涉及区域：

- `src/shared/input-pipeline.ts`

要求：

1. 创建 frontmatter 时补充 `contentTitle`、`aiTitle`、`titleSource`。
2. 初始 `aiTitle` 为空。
3. 初始 `title` 使用 `contentTitle`。
4. 初始 `titleSource` 使用 `content` 或 `fallback`。
5. body 使用新的文章结构。

验收：

- 新文档 frontmatter 包含 `title`、`contentTitle`、`aiTitle`、`titleSource`。
- 首页卡片标题与正文 H1 一致。

### 任务 4：保存时从正文 H1 同步 `contentTitle`

涉及区域：

- `src/pages/ArticlePage.vue`
- `src/shared/inbox-document.ts`

要求：

1. 用户编辑正文 H1 后，保存时同步 `contentTitle`。
2. 如果没有 `aiTitle`，同步更新 `title` 为新的 `contentTitle`。
3. 如果已有 `aiTitle`，默认不覆盖 `title`，除非后续明确设计手动标题策略。
4. 不要在用户编辑 frontmatter `title` 时反向修改正文 H1。

验收：

- 修改正文第一行 `# 新标题` 后保存，首页卡片标题可更新。
- 只改 frontmatter `title` 时，正文 H1 不被自动改写。

### 任务 5：改造 AI enrich 写回策略

涉及区域：

- `src/shared/ai-enrichment.ts`
- `electron/main.ts`

要求：

1. AI 请求仍返回结构化 JSON，但字段建议调整为 `title`、`tags`、`summaryMarkdown`。
2. AI 成功后：
   - 写入 `aiTitle`
   - 更新 `title`
   - 设置 `titleSource: ai`
   - 将总结写入或更新 `## AI 总结` 区块
   - 保留 `## 原文` 区块
3. AI 失败后：
   - 不破坏已有正文
   - 只更新 `enrichStatus: failed`
   - 写入 `enrichError`

验收：

- Enrich 成功后，正文能看到明显的 `## AI 总结`。
- Enrich 失败后，用户仍能看到标题和原文，并可再次手动 Enrich。
- 重复 Enrich 时，不重复堆叠多个 `## AI 总结` 区块。

### 任务 6：区块更新策略

建议实现工具函数：

- `upsertMarkdownSection(body, heading, content)`
- `getMarkdownSection(body, heading)`
- `hasMarkdownSection(body, heading)`

规则：

1. `## AI 总结` 存在时，替换该区块内容。
2. `## AI 总结` 不存在时，插入到 H1 后、`## 原文` 前。
3. `## 原文` 必须保留；如不存在，则追加到文末。
4. 不要用脆弱的字符串拼接覆盖整篇文章，尽量只更新目标区块。

验收：

- 已手动编辑的正文其他部分不会被 Enrich 意外覆盖。
- `## 原文` 不丢失。

### 任务 7：首页与文章页标题显示收口

涉及区域：

- `src/shared/inbox-document.ts`
- `src/stores/inbox.ts`
- `src/pages/ArticlePage.vue`

要求：

1. 首页卡片和文章页 header 使用同一个标题解析函数。
2. 优先显示 `aiTitle`，其次 `contentTitle`，再 fallback。
3. 旧文档只有 `title` 时仍兼容。
4. 对旧文档中的 `## Content`，预览可继续兼容隐藏，但新文档不再生成。

验收：

- 新旧文档都能正常显示标题。
- 新文档标题不依赖 slug。

### 任务 8：兼容旧文档

要求：

1. 不做批量迁移。
2. 旧文档读取时仍支持 `## Content` 预览清理。
3. 旧文档打开后，用户保存时可逐步进入新字段结构。
4. 不要破坏已有 frontmatter 字段。

验收：

- 旧文档可打开、保存、收藏、删除。
- 没有 `contentTitle` / `aiTitle` 的旧文档不会报错。

### 任务 9：补充最小测试样例

优先覆盖纯函数，不强行做复杂 UI 测试。

建议样例：

1. markdown 输入带 H1。
2. markdown 输入无 H1。
3. 普通文本输入。
4. URL 输入。
5. Enrich 成功插入 `## AI 总结`。
6. Enrich 重复执行替换旧总结。
7. Enrich 失败保留正文。
8. 旧文档只有 `title` 时正常展示。

## 暂不做范围

1. 暂不做复杂网页抓取。
2. 暂不做 B 站/YouTube 标题解析。
3. 暂不做 Open Graph / oEmbed / transcript 解析。
4. 暂不做批量迁移旧文档。
5. 暂不设计完整的手动标题锁定 UI。
6. 暂不改变 todo 月度聚合逻辑。

## 后续扩展方向

1. 链接解析：根据 URL 拉取网页标题、描述、封面。
2. 视频解析：识别 B 站、YouTube，抓取标题、作者、简介、字幕或转写。
3. Markdown 粘贴增强：保留原文 H1、frontmatter、列表和引用结构。
4. 原文区块增强：记录来源类型、抓取时间、解析状态。
5. 标题锁定：用户手动指定 `titleSource: manual` 后，AI 不再覆盖展示标题。

## 推荐执行顺序

1. 先做标题提取纯函数。
2. 再改 input pipeline 的新文档结构。
3. 然后统一首页和文章页标题解析。
4. 接着做保存时正文 H1 到 `contentTitle` 的同步。
5. 最后改 AI enrich，把总结写入 `## AI 总结`。

这一轮的判断标准很简单：新建一篇文章后，它看起来应该像一篇自然的 markdown 文章，而不是内部数据结构的展开。
