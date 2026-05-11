/**
 * Typora Theme Converter 验证脚本
 * 验证 #write h1 不会生成裸 .tiptap selector。
 *
 * 运行：node scripts/test-typora-theme-converter.mjs
 */

import { convertTyporaTheme } from '../src/shared/typora-theme-converter.ts'

// 使用固定 id 避免 slug 不一致问题
const THEME_ID = 'typora-test'
const EXPECTED_ID = 'typora-sample' // sample.css 生成的 id

const testCases = [
  {
    name: '复合 selector (#write h1, #write p)',
    css: '#write h1 { color: red; }\n#write p { color: blue; }',
    mustContain: [
      "[data-ai-theme='" + EXPECTED_ID + "'] .tiptap h1,",
      "[data-ai-theme='" + EXPECTED_ID + "'] .rich-editor__content h1",
      "[data-ai-theme='" + EXPECTED_ID + "'] .tiptap p,",
      "[data-ai-theme='" + EXPECTED_ID + "'] .rich-editor__content p",
    ],
    mustNotContain: [
      "[data-typography-theme='" + EXPECTED_ID + "']",
      "[data-app-theme='" + EXPECTED_ID + "']",
      "[data-code-theme='" + EXPECTED_ID + "']",
    ],
  },
  {
    name: '纯 #write 根容器',
    css: '#write { background: white; font-family: serif; }',
    mustContain: [
      "[data-ai-theme='" + EXPECTED_ID + "'] .tiptap,",
      "[data-ai-theme='" + EXPECTED_ID + "'] .rich-editor__content",
    ],
    mustNotContain: [
      "[data-typography-theme='" + EXPECTED_ID + "']",
      "[data-app-theme='" + EXPECTED_ID + "']",
      "[data-code-theme='" + EXPECTED_ID + "']",
    ],
  },
  {
    name: '.md-fences to pre',
    css: '.md-fences { background: #eee; }\n.md-fences code { font-size: 14px; }',
    mustContain: [
      "[data-ai-theme='" + EXPECTED_ID + "'] .tiptap pre,",
      "[data-ai-theme='" + EXPECTED_ID + "'] .rich-editor__content pre",
      "[data-ai-theme='" + EXPECTED_ID + "'] .tiptap pre code,",
      "[data-ai-theme='" + EXPECTED_ID + "'] .rich-editor__content pre code",
    ],
    mustNotContain: [
      "[data-typography-theme='" + EXPECTED_ID + "']",
      "[data-app-theme='" + EXPECTED_ID + "']",
      "[data-code-theme='" + EXPECTED_ID + "']",
    ],
  },
  {
    name: 'blockquote 嵌套 p',
    css: '#write blockquote p { margin: 0; }',
    mustContain: [
      "[data-ai-theme='" + EXPECTED_ID + "'] .tiptap blockquote p,",
      "[data-ai-theme='" + EXPECTED_ID + "'] .rich-editor__content blockquote p",
    ],
    mustNotContain: [
      "[data-typography-theme='" + EXPECTED_ID + "']",
      "[data-app-theme='" + EXPECTED_ID + "']",
      "[data-code-theme='" + EXPECTED_ID + "']",
    ],
  },
  {
    name: '.task-list 映射',
    css: '.task-list { list-style: none; }',
    mustContain: [
      "[data-ai-theme='" + EXPECTED_ID + "'] .tiptap ul[data-type=\"taskList\"],",
      "[data-ai-theme='" + EXPECTED_ID + "'] .rich-editor__content ul[data-type=\"taskList\"]",
    ],
    mustNotContain: [
      "[data-typography-theme='" + EXPECTED_ID + "']",
      "[data-app-theme='" + EXPECTED_ID + "']",
      "[data-code-theme='" + EXPECTED_ID + "']",
    ],
  },
  {
    name: 'Typora 全局正文 selector 映射',
    css: "h1, h2 { font-family: serif; }\np { font-size: 1rem; }\na { color: #2875d9; }\nbody, #write { font-family: 'Computer Modern'; }\n@media print { h1 { page-break-before: always; } }",
    mustContain: [
      "[data-ai-theme='" + EXPECTED_ID + "'] .tiptap h1,",
      "[data-ai-theme='" + EXPECTED_ID + "'] .rich-editor__content h1",
      "[data-ai-theme='" + EXPECTED_ID + "'] .tiptap h2,",
      "[data-ai-theme='" + EXPECTED_ID + "'] .rich-editor__content h2",
      "[data-ai-theme='" + EXPECTED_ID + "'] .tiptap p,",
      "[data-ai-theme='" + EXPECTED_ID + "'] .rich-editor__content p",
      "[data-ai-theme='" + EXPECTED_ID + "'] .tiptap a,",
      "[data-ai-theme='" + EXPECTED_ID + "'] .rich-editor__content a",
      "[data-ai-theme='" + EXPECTED_ID + "'] .tiptap,",
      "[data-ai-theme='" + EXPECTED_ID + "'] .rich-editor__content",
    ],
    mustNotContain: [
      'page-break-before',
      "[data-typography-theme='" + EXPECTED_ID + "']",
      "[data-app-theme='" + EXPECTED_ID + "']",
      "[data-code-theme='" + EXPECTED_ID + "']",
    ],
  },
]

let allPassed = true

const themeConfigTests = [
  {
    name: 'Typora 链接色不写入 system.accent',
    css: '#write a { color: #2875d9; }',
    expectedPath: 'tokens.system.accent',
    expectedValue: undefined,
  },
  {
    name: '提取 article.bg（背景色）',
    css: '#write { background: #f5f5f5; }',
    expectedPath: 'tokens.article.bg',
    expectedValue: '#f5f5f5',
  },
  {
    name: '提取 article.text（正文字色）',
    css: '#write p { color: #333333; }',
    expectedPath: 'tokens.article.text',
    expectedValue: '#333333',
  },
  {
    name: '提取 article.heading',
    css: '#write h1 { color: #1a1a1a; }',
    expectedPath: 'tokens.article.heading',
    expectedValue: '#1a1a1a',
  },
  {
    name: '提取 article.h1Align',
    css: '#write h1 { text-align: center; }',
    expectedPath: 'tokens.article.h1Align',
    expectedValue: 'center',
  },
  {
    name: '提取 article.paragraphSpacing',
    css: '#write p { margin-bottom: 0.72rem; }',
    expectedPath: 'tokens.article.paragraphSpacing',
    expectedValue: '0.72rem',
  },
  {
    name: '提取 fonts.body',
    css: "#write { font-family: 'Computer Modern', serif; }",
    expectedPath: 'tokens.fonts.body',
    expectedValue: "'Computer Modern', serif",
  },
  {
    name: '提取 fonts.heading',
    css: '#write h1, #write h2 { font-family: Georgia, serif; }',
    expectedPath: 'tokens.fonts.heading',
    expectedValue: 'Georgia, serif',
  },
  {
    name: '提取 code.blockBg',
    css: '.md-fences { background: #f6f8fa; }',
    expectedPath: 'tokens.code.blockBg',
    expectedValue: '#f6f8fa',
  },
  {
    name: '提取 blocks.blockquoteBg',
    css: '#write blockquote { background-color: #f9f9f9; }',
    expectedPath: 'tokens.blocks.blockquoteBg',
    expectedValue: '#f9f9f9',
  },
  {
    name: '提取 article.link',
    css: '#write a { color: #2875d9; }',
    expectedPath: 'tokens.article.link',
    expectedValue: '#2875d9',
  },
]

for (const tc of themeConfigTests) {
  process.stdout.write('\nTest: ' + tc.name + '\n')
  const result = await convertTyporaTheme({
    css: tc.css,
    fileName: 'sample.css',
    existingIds: [THEME_ID],
  })

  if (!result.themeConfig) {
    process.stdout.write('  FAIL: themeConfig 为空\n')
    allPassed = false
    continue
  }

  const value = tc.expectedPath.split('.').reduce((current, key) => current?.[key], result.themeConfig)

  if (value === tc.expectedValue) {
    process.stdout.write(`  PASS: ${tc.expectedPath} = "${value}"\n`)
  } else {
    process.stdout.write(`  FAIL: 期望 ${tc.expectedPath} = "${tc.expectedValue}", 得到 "${value}"\n`)
    allPassed = false
  }
}

for (const tc of testCases) {
  process.stdout.write('\nTest: ' + tc.name + '\n')
  const result = await convertTyporaTheme({
    css: tc.css,
    fileName: 'sample.css',
    existingIds: [THEME_ID],
  })

  let passed = true

  for (const mustContain of tc.mustContain) {
    if (!result.css.includes(mustContain)) {
      process.stdout.write('  FAIL: 缺少 "' + mustContain + '"\n')
      passed = false
    } else {
      process.stdout.write('  PASS: 包含 "' + mustContain + '"\n')
    }
  }

  for (const mustNotContain of tc.mustNotContain) {
    if (result.css.includes(mustNotContain)) {
      process.stdout.write('  FAIL: 不应包含 "' + mustNotContain + '"\n')
      passed = false
    } else {
      process.stdout.write('  PASS: 不包含 "' + mustNotContain + '"\n')
    }
  }

  if (passed) {
    process.stdout.write('  OK: ' + tc.name + ' 通过\n')
  } else {
    process.stdout.write('  FAIL: ' + tc.name + ' 失败\n')
    process.stdout.write('  输出 CSS:\n' + result.css + '\n')
    process.stdout.write('  Warnings: ' + result.warnings.join(', ') + '\n')
    allPassed = false
  }
}

if (allPassed) {
  process.stdout.write('\nAll tests passed\n')
  process.exit(0)
} else {
  process.stdout.write('\nSome tests failed\n')
  process.exit(1)
}
