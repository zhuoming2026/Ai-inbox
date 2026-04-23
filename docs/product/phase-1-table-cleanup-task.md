# Phase 1 Table Cleanup 任务单

## 背景

当前 review 已确认两处不一致：

1. `src/modules/rich-editor/config/toolbar.ts` 里 fixed toolbar 仍然暴露了 `table`
2. `docs/product/editor-stabilization-execution-log.md` 把 “toolbar / slash 暴露能力集合基本一致” 写成了已完成，但实际上 toolbar/floating 和 slash 还不一致

这两个问题都围绕同一个核心：

**Phase 1 既然定义为“删掉未闭环入口”，那 `table` 就不能继续留在可见 UI 里。**

---

## 本轮目标

完成后应达到：

1. `table` 不再出现在当前对外可见的 toolbar / floating / slash 入口中
2. 执行日志和代码完全一致
3. 不再出现“代码还留着入口，但文档写成已经删掉”的情况

---

## 必做项

### 1. 清理 toolbar 中的 `table` 入口

请检查并修改：

- `src/modules/rich-editor/config/toolbar.ts`

要求：

- fixed toolbar 中移除 `table`
- floating menu 中移除 `table`
- 如果还有其他配置残留也一起清掉

目标是：

**当前版本的可见菜单里，不再出现 `table`。**

---

### 2. 再确认 slash menu 中没有 `table`

请检查并确认：

- `src/modules/rich-editor/config/suggestion-menu.ts`

要求：

- slash menu 中不再有 `table`
- 如果已经移除，不需要重复改，但请在交付说明里明确写“已确认”

---

### 3. 更新执行日志

请修改：

- `docs/product/editor-stabilization-execution-log.md`

要求：

1. 把 Phase 1 里和 `table` 相关的描述改成与当前代码一致
2. 不要再写模糊表述
3. 明确写出：
   - `table` 已从 fixed toolbar 移除
   - `table` 已从 floating menu 移除
   - `table` 已从 slash menu 移除
4. 如果有“toolbar / slash 暴露能力集合基本一致”这类结论，必须建立在真实代码一致的前提上

---

### 4. 自查是否还有残留入口

请全文检查 `rich-editor` 里是否还有可见层面的 `table` 残留，例如：

- toolbar config
- suggestion menu config
- floating menu config
- 其他直接渲染菜单项的地方

要求：

- 不需要删除底层 `tableExtensions`
- 这轮重点是**去掉对用户可见的入口**
- 底层保留可以，但 UI 不应继续暴露

---

## 交付说明要求

交付时请附上：

1. 修改了哪些文件
2. `table` 分别从哪些入口中被移除
3. 执行日志如何改了
4. 是否还保留底层 `table` extension
5. `npm run typecheck` 结果

---

## 不要做的事

这轮不要顺手：

- 不要恢复 `table`
- 不要扩新功能
- 不要改 slash 逻辑
- 不要改 markdown 逻辑
- 不要改样式
- 不要修改与本轮无关的文档结构

这轮只解决：

- `table` 可见入口残留
- 文档与代码不一致

---

## 验收标准

完成后，必须满足：

1. `table` 不再出现在 fixed toolbar
2. `table` 不再出现在 floating menu
3. `table` 不再出现在 slash menu
4. Phase 1 日志与代码一致
5. `npm run typecheck` 通过
