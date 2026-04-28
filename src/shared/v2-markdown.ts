import type { V2CardKind } from './v2-types'

export function normalizeMarkdownText(raw: string) {
  return raw.replace(/\r\n/g, '\n')
}

export function stripLeadingFrontmatterForDisplay(raw: string) {
  return normalizeMarkdownText(raw).replace(/^---\n[\s\S]*?\n---\n?/, '')
}

export function extractMarkdownCardTitle(raw: string) {
  const normalized = stripLeadingFrontmatterForDisplay(raw)
  const firstLine = normalized.split('\n')[0]?.trim() || ''
  const match = firstLine.match(/^#\s+(.+)$/)
  return match?.[1]?.trim() || ''
}

export function extractMarkdownPreview(raw: string) {
  const normalized = stripLeadingFrontmatterForDisplay(raw)
  const lines = normalized.split('\n')
  const previewLines = lines[0]?.trim().match(/^#\s+.+$/) ? lines.slice(1) : lines

  return previewLines
    .join('\n')
    .replace(/^```[\s\S]*?```/gm, '')
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/[#>*_`~-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function detectCaptureKind(type: string | undefined, content: string): V2CardKind {
  const trimmed = content.trim()
  if (type === 'todo' || /^todo\s+/i.test(trimmed)) return 'todo'
  return 'note'
}

export function createInboxFilename(now = new Date()) {
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const mi = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const ms = String(now.getMilliseconds()).padStart(3, '0')
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}-${ms}.md`
}
