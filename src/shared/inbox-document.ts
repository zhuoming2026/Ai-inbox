export type InboxDocumentType = 'note' | 'todo' | 'link' | 'image' | 'research'

export type InboxFrontmatter = Record<string, unknown>

export interface InboxDocument {
  slug: string
  type: InboxDocumentType
  filename: string
  created: string
  frontmatter: InboxFrontmatter
  body: string
  raw: string
}

export function parseFrontmatter(content: string): { frontmatter: InboxFrontmatter; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { frontmatter: {}, body: content }

  const frontmatter: InboxFrontmatter = {}
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':')
    if (!key || rest.length === 0) continue

    const rawValue = rest.join(':').trim()

    if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
      frontmatter[key.trim()] = rawValue.slice(1, -1)
      continue
    }

    if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      try {
        frontmatter[key.trim()] = JSON.parse(rawValue)
      } catch {
        frontmatter[key.trim()] = rawValue
      }
      continue
    }

    frontmatter[key.trim()] = rawValue
  }

  return { frontmatter, body: match[2] }
}

export function buildFrontmatter(frontmatter: InboxFrontmatter, body: string) {
  const lines = Object.entries(frontmatter).map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
  return `---\n${lines.join('\n')}\n---\n\n${body}`
}

export function detectDocumentType(slug: string): InboxDocumentType {
  if (slug.startsWith('todo-')) return 'todo'
  if (slug.startsWith('image-')) return 'image'
  if (slug.startsWith('link-')) return 'link'
  if (slug.startsWith('research-')) return 'research'
  return 'note'
}

export function getEditableBody(body: string) {
  return body.replace(/^## Content\n\n/, '')
}

export function getPreviewText(body: string) {
  return getEditableBody(body)
    .replace(/## Raw\n[\s\S]*$/, '')
    .trim()
}

export function toInboxDocument(params: {
  slug: string
  content: string
  created: string
  filename?: string
}): InboxDocument {
  const { frontmatter, body } = parseFrontmatter(params.content)

  return {
    slug: params.slug,
    type: detectDocumentType(params.slug),
    filename: params.filename || `${params.slug}.md`,
    created: params.created,
    frontmatter,
    body,
    raw: params.content,
  }
}
