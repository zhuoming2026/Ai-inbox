#!/usr/bin/env node
/**
 * AI-inbox MCP Child Process (Stdio Transport)
 * 使用 @modelcontextprotocol/sdk 的 StdioServer 暴露 v1 工具集。
 * 配置文件: ~/.ai-inbox-mcp/config.json
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

// ─── 路径配置 ────────────────────────────────────────────────────────────────

function expandTilde(filepath) {
  if (filepath.startsWith('~/')) {
    return path.join(os.homedir(), filepath.slice(2))
  }
  return filepath
}

function getDefaultConfigPath() {
  return path.join(os.homedir(), '.ai-inbox-mcp', 'config.json')
}

function getDefaultInboxPath() {
  return path.join(os.homedir(), 'ai-inbox')
}

function getConfig() {
  const configPath = process.env.MCP_CONFIG_PATH || getDefaultConfigPath()
  try {
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      // 兼容旧版 inbox_dir 字段
      if (cfg.inboxPath === undefined && cfg.inbox_dir !== undefined) {
        cfg.inboxPath = cfg.inbox_dir
      }
      if (cfg.inboxPath === undefined) {
        cfg.inboxPath = getDefaultInboxPath()
      }
      return cfg
    }
  } catch (e) {
    // ignore
  }
  return {
    inboxPath: getDefaultInboxPath(),
    archivePath: path.join(os.homedir(), 'lzm', 'llm-wiki', 'MyNote'),
    mcpHttpPort: 3100,
    aiProcessingMode: 'off',
  }
}

function ensureConfig() {
  const configPath = process.env.MCP_CONFIG_PATH || getDefaultConfigPath()
  if (!fs.existsSync(configPath)) {
    const dir = path.dirname(configPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const config = getConfig()
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
  }
  return getConfig()
}

// ─── Frontmatter / 文件工具 ─────────────────────────────────────────────────

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'item'
}

function formatDate(date) {
  return date.toISOString().split('T')[0]
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { frontmatter: {}, body: content }

  const frontmatter = {}
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':')
    if (!key || rest.length === 0) continue

    const rawValue = rest.join(':').trim()
    const k = key.trim()

    if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
      frontmatter[k] = rawValue.slice(1, -1)
    } else if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      try {
        frontmatter[k] = JSON.parse(rawValue)
      } catch {
        frontmatter[k] = rawValue
      }
    } else {
      frontmatter[k] = rawValue
    }
  }

  return { frontmatter, body: match[2] }
}

function buildFrontmatter(frontmatter, body) {
  const lines = Object.entries(frontmatter).map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
  return `---\n${lines.join('\n')}\n---\n\n${body}`
}

function detectRawInputType(typeHint, content) {
  if (typeHint === 'image') return 'image'
  const trimmed = content.trim()
  if (/^https?:\/\//i.test(trimmed)) return 'url'
  return 'text'
}

function classifyInput(typeHint, content) {
  const trimmed = content.trim()
  const rawInputType = detectRawInputType(typeHint, trimmed)

  if (typeHint === 'todo' || /^todo\s+/i.test(trimmed)) {
    return { rawInputType, documentType: 'todo', normalizedContent: trimmed.replace(/^todo\s+/i, '').trim() }
  }
  if (typeHint === 'link' || typeHint === 'research' || /^研究\s+/u.test(trimmed)) {
    return { rawInputType, documentType: 'link', normalizedContent: trimmed }
  }
  if (typeHint === 'note' || /^记录\s+/u.test(trimmed)) {
    return { rawInputType, documentType: 'note', normalizedContent: trimmed.replace(/^记录\s+/u, '').trim() }
  }
  if (rawInputType === 'url') {
    return { rawInputType, documentType: 'link', normalizedContent: trimmed }
  }
  return { rawInputType, documentType: 'note', normalizedContent: trimmed }
}

function extractFirstMeaningfulLine(text) {
  if (!text) return ''
  const lines = text.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (/^---+$/.test(trimmed)) continue
    if (/^https?:\/\//i.test(trimmed)) continue
    return trimmed
  }
  return ''
}

function baseFrontmatter(params) {
  const frontmatter = {
    type: params.type,
    title: params.title || 'Untitled',
    contentTitle: params.contentTitle,
    aiTitle: '',
    titleSource: params.titleSource,
    created: params.today,
    updated: params.today,
    tags: [params.type],
    source: 'mcp',
    bucket: 'inbox',
    parseMode: 'deterministic',
    enrichStatus: 'none',
    aiProvider: 'none',
    rawInputType: params.rawInputType,
  }
  return frontmatter
}

function ensureInboxDir(inboxPath) {
  if (!fs.existsSync(inboxPath)) {
    fs.mkdirSync(inboxPath, { recursive: true })
  }
}

function getTodoSlugForMonth(now) {
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return `todo-${month}`
}

function processInputToDocument(typeHint, content) {
  const now = new Date()
  const today = formatDate(now)
  const classification = classifyInput(typeHint, content)
  const { rawInputType, documentType, normalizedContent } = classification

  if (documentType === 'todo') {
    if (!normalizedContent) throw new Error('TODO 内容不能为空')
    const slug = getTodoSlugForMonth(now)
    const line = `- [ ] ${normalizedContent}`
    const inboxPath = getConfig().inboxPath
    const inboxExpanded = expandTilde(inboxPath)
    const todoPath = path.join(inboxExpanded, `${slug}.md`)
    ensureInboxDir(inboxExpanded)

    if (fs.existsSync(todoPath)) {
      const existing = fs.readFileSync(todoPath, 'utf-8')
      const { frontmatter, body } = parseFrontmatter(existing)
      const updated = { ...frontmatter, updated: today }
      fs.writeFileSync(todoPath, buildFrontmatter(updated, `${body.trim()}\n${line}\n`), 'utf-8')
    } else {
      const frontmatter = baseFrontmatter({
        type: 'todo',
        title: `Todo ${slug.replace('todo-', '')}`,
        contentTitle: `Todo ${slug.replace('todo-', '')}`,
        titleSource: 'fallback',
        today,
        rawInputType,
      })
      fs.writeFileSync(todoPath, buildFrontmatter(frontmatter, `## Content\n\n${line}\n`), 'utf-8')
    }
    return { slug, documentType, action: 'appended' }
  }

  if (documentType === 'link') {
    const parsed = new URL(normalizedContent)
    const hostTitle = parsed.hostname.replace(/^www\./, '') || normalizedContent
    const contentTitle = extractFirstMeaningfulLine(normalizedContent) || hostTitle
    const title = contentTitle
    const slug = `link-${Date.now()}-${slugify(hostTitle)}`
    const inboxPath = getConfig().inboxPath
    const inboxExpanded = expandTilde(inboxPath)
    ensureInboxDir(inboxExpanded)
    const filepath = path.join(inboxExpanded, `${slug}.md`)
    const frontmatter = baseFrontmatter({
      type: 'link',
      title,
      contentTitle,
      titleSource: 'content',
      today,
      rawInputType,
    })
    const body = [`# ${title}`, '', '## 原文', '', normalizedContent].join('\n')
    fs.writeFileSync(filepath, buildFrontmatter(frontmatter, body), 'utf-8')
    return { slug, documentType, action: 'created' }
  }

  // note / research
  if (!normalizedContent) throw new Error('输入内容不能为空')
  const firstLine = extractFirstMeaningfulLine(normalizedContent) || ''
  const contentTitle = firstLine.slice(0, 80)
  const title = contentTitle || 'Untitled'
  const slug = `${documentType}-${Date.now()}-${slugify(title)}`
  const inboxPath = getConfig().inboxPath
  const inboxExpanded = expandTilde(inboxPath)
  ensureInboxDir(inboxExpanded)
  const filepath = path.join(inboxExpanded, `${slug}.md`)
  const frontmatter = baseFrontmatter({
    type: documentType,
    title,
    contentTitle,
    titleSource: contentTitle ? 'content' : 'fallback',
    today,
    rawInputType,
  })
  const body = [`# ${title}`, '', '## 原文', '', normalizedContent].join('\n')
  fs.writeFileSync(filepath, buildFrontmatter(frontmatter, body), 'utf-8')
  return { slug, documentType, action: 'created' }
}

function listInbox() {
  const config = getConfig()
  const inboxExpanded = expandTilde(config.inboxPath)
  if (!fs.existsSync(inboxExpanded)) return []
  const files = fs.readdirSync(inboxExpanded).filter(f => f.endsWith('.md'))
  return files.map(filename => {
    const filepath = path.join(inboxExpanded, filename)
    const stats = fs.statSync(filepath)
    const content = fs.readFileSync(filepath, 'utf-8')
    const { frontmatter } = parseFrontmatter(content)
    const slug = filename.replace('.md', '')
    return {
      slug,
      filename,
      type: frontmatter.type || 'note',
      title: frontmatter.title || slug,
      created: frontmatter.created || stats.birthtime.toISOString().split('T')[0],
      updated: frontmatter.updated || '',
      bucket: frontmatter.bucket || 'inbox',
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
    }
  }).sort((a, b) => (b.created > a.created ? 1 : -1))
}

// ─── MCP 工具定义 ────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'process_note',
    description: '将文本内容作为笔记存入 ai-inbox。type 为 note 时为普通笔记。',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: '笔记内容' },
        type: { type: 'string', description: '类型，默认 note。可选: note, research' },
      },
      required: ['content'],
    },
  },
  {
    name: 'process_todo',
    description: '将 TODO 内容追加到当月 todo 文件（todo-YYYY-MM.md）',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'TODO 内容' },
      },
      required: ['content'],
    },
  },
  {
    name: 'process_link',
    description: '将 URL 作为链接存入 ai-inbox',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: '链接地址' },
        description: { type: 'string', description: '可选描述' },
      },
      required: ['url'],
    },
  },
  {
    name: 'process_image',
    description: '将图片路径或描述存入 ai-inbox（目前仅支持文本描述）',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: '图片描述或路径' },
      },
      required: ['content'],
    },
  },
  {
    name: 'detect_intent',
    description: '分析输入内容意图，返回分类结果',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: '待分析内容' },
      },
      required: ['content'],
    },
  },
  {
    name: 'list_inbox',
    description: '列出 ai-inbox 中所有文档',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_config',
    description: '获取当前 MCP 配置',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'init_config',
    description: '初始化 MCP 配置文件（若不存在）',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'reload_config',
    description: '重新读取配置文件',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
]

// ─── 工具执行 ────────────────────────────────────────────────────────────────

async function handleToolCall(name, args) {
  switch (name) {
    case 'process_note': {
      const content = args.content || ''
      const type = args.type || 'note'
      const result = processInputToDocument(type, content)
      return [{
        type: 'text',
        text: JSON.stringify({ ok: true, ...result }),
      }]
    }

    case 'process_todo': {
      const content = args.content || ''
      const result = processInputToDocument('todo', content)
      return [{
        type: 'text',
        text: JSON.stringify({ ok: true, ...result }),
      }]
    }

    case 'process_link': {
      let url = args.url || ''
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url
      const description = args.description || ''
      const fullContent = description ? `${description}\n${url}` : url
      const result = processInputToDocument('link', fullContent)
      return [{
        type: 'text',
        text: JSON.stringify({ ok: true, ...result }),
      }]
    }

    case 'process_image': {
      const content = args.content || ''
      const result = processInputToDocument('image', content)
      return [{
        type: 'text',
        text: JSON.stringify({ ok: true, ...result }),
      }]
    }

    case 'detect_intent': {
      const content = args.content || ''
      const classification = classifyInput(undefined, content)
      return [{
        type: 'text',
        text: JSON.stringify({
          rawInputType: classification.rawInputType,
          documentType: classification.documentType,
          normalizedContent: classification.normalizedContent.slice(0, 200),
        }),
      }]
    }

    case 'list_inbox': {
      const items = listInbox()
      return [{
        type: 'text',
        text: JSON.stringify({ items, total: items.length }),
      }]
    }

    case 'get_config': {
      const config = getConfig()
      return [{
        type: 'text',
        text: JSON.stringify(config),
      }]
    }

    case 'init_config': {
      const config = ensureConfig()
      return [{
        type: 'text',
        text: JSON.stringify({ ok: true, config }),
      }]
    }

    case 'reload_config': {
      // No-op for stdio mode (config is re-read each time)
      const config = getConfig()
      return [{
        type: 'text',
        text: JSON.stringify({ ok: true, config }),
      }]
    }

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

// ─── MCP Server ────────────────────────────────────────────────────────────────

const server = new Server(
  {
    name: 'ai-inbox-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  try {
    const result = await handleToolCall(name, args || {})
    return { content: result }
  } catch (error) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }],
      isError: true,
    }
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch(err => {
  console.error('MCP server error:', err)
  process.exit(1)
})
