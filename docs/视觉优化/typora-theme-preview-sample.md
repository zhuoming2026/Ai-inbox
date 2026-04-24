# Typora 主题预览样本文档

本文档用于验证 Typora 主题导入后的排版效果，涵盖所有常见 Markdown 元素。

---

## 一级标题（H1）

### 二级标题（H2）

#### 三级标题（H3）

---

## 段落文本

这是一段普通段落。Typora 主题导入后，这段文字的字体、颜色、行高应当与原主题一致。

**这是粗体文字**，用于强调。*这是斜体文字*，用于次要强调。

这是一段包含链接的段落，例如[访问 GitHub](https://github.com)。

行内代码示例：`const foo = 'bar'`。

---

## 引用块

> 这是一个引用块。
>
> 引用的第二段，可以包含**粗体**和*斜体*。
>
> > 嵌套引用块

---

## 列表

### 无序列表

- 列表项一
- 列表项二
  - 嵌套列表项
  - 嵌套列表项二
- 列表项三

### 有序列表

1. 第一步
2. 第二步
3. 第三步
   1. 嵌套有序列表
   2. 嵌套有序列表二

### 任务列表

- [x] 已完成的任务
- [ ] 未完成的任务
- [ ] 另一个待办事项

---

## 代码块

```typescript
interface User {
  id: string
  name: string
  email: string
}

function greet(user: User): string {
  return `Hello, ${user.name}!`
}

const user: User = {
  id: '1',
  name: 'Alice',
  email: 'alice@example.com',
}

console.log(greet(user))
```

---

## 表格

| 姓名 | 邮箱 | 角色 |
|------|------|------|
| Alice | alice@example.com | Admin |
| Bob | bob@example.com | Editor |
| Carol | carol@example.com | Viewer |

---

## 图片占位

![图片描述](https://example.com/image.png)

---

## 分割线

上面是分割线。

---

> **提示**：如果某个元素渲染异常，检查对应选择器是否在转换后 CSS 中正确映射。
