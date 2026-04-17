# AI-inbox Design System

---

## 概述

**项目：** AI-inbox 桌面应用（Electron + Vue 3）
**Vibe:** Warm, editorial, journal-like

---

## 品牌

- **Name:** AI-inbox
- **Type:** Desktop app (Electron + Vue 3)
- **Font:** Acme (headings), Newsreader (body)

---

## 主题系统

### Light（默认）

```css
--bg-primary: #f5f4ed
--bg-secondary: #faf9f6
--bg-card: #ffffff
--bg-sidebar: #f9f9f9

--color-primary: #fabb18
--color-primary-hover: #f9c84a
--color-primary-pressed: #d9a015

--text-primary: #1a1a1a
--text-secondary: rgba(26, 26, 26, 0.6)
--text-placeholder: rgba(26, 26, 26, 0.3)

--border-color: rgba(26, 26, 26, 0.08)

--shadow-card: 0px 4px 20px rgba(0, 0, 0, 0.03)
--shadow-sidebar: 0px 16px 31px rgba(0, 0, 0, 0.01)
```

### Claude（暖色调）

Style: Warm terracotta, clean editorial
Ref: https://getdesign.md/claude/design-md

```css
--bg-primary: #fef9f5
--bg-secondary: #fdf6ef
--bg-card: #ffffff
--bg-sidebar: #fef6ed

--color-primary: #c26d47
--color-primary-hover: #d17d5a
--color-primary-pressed: #a85a38

--text-primary: #2d2a26
--text-secondary: rgba(45, 42, 38, 0.6)
--text-placeholder: rgba(45, 42, 38, 0.3)

--border-color: rgba(45, 42, 38, 0.1)

--shadow-card: 0px 4px 24px rgba(194, 109, 71, 0.08)
--shadow-sidebar: 0px 16px 40px rgba(194, 109, 71, 0.06)
```

### Dark

```css
--bg-primary: #1a1a1a
--bg-secondary: #242424
--bg-card: #2d2d2d
--bg-sidebar: #232323

--color-primary: #e89c6a
--color-primary-hover: #f0ad7e
--color-primary-pressed: #d08854

--text-primary: #f5f4ed
--text-secondary: rgba(245, 244, 237, 0.6)
--text-placeholder: rgba(245, 244, 237, 0.3)

--border-color: rgba(245, 244, 237, 0.1)

--shadow-card: 0px 4px 20px rgba(0, 0, 0, 0.3)
--shadow-sidebar: 0px 16px 40px rgba(0, 0, 0, 0.4)
```

---

## 字体

### Headings

- Font: `Acme` (Google Fonts, sans-serif)
- Logo: 28px
- Section: 28px
- Card Title: 18px

### Body

- Font: `Newsreader` (Google Fonts, serif)
- Editor: 20px
- Input: 20px (italic)
- Base: 14px

### Line Heights

- Body: 1.6
- Editor: 1.8

---

## 间距

### Page Padding

- Left Content: `31px 48px 48px`
- Right Content: `37px 30px 25px 29px`

### Components

- Section Gap: 32px
- Card Gap: 24px
- Nav Height: 58px

---

## 圆角

- Page: 38px (sidebar corners)
- Card: 12px - 34px
- Button: 28px (circle)

---

## 过渡

- Default: `cubic-bezier(.4, 0, 0.2, 1)`
- Duration: 0.2s - 0.6s