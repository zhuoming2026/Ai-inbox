import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { InboxDocument } from '../shared/inbox-document'
import { getDocumentBucket, getPreviewText, resolveDisplayTitle, type DocumentBucket } from '../shared/inbox-document'
import { extractMarkdownCardTitle, extractMarkdownPreview } from '../shared/v2-markdown'
import type { V2InboxCard } from '../shared/v2-types'

export interface InboxCard {
  slug: string
  type: string
  title: string
  hasTitle: boolean
  preview: string
  tags: string[]
  enrichStatus: string
  bucket: DocumentBucket
  created: string
  raw?: string
}

function isV2InboxCard(file: InboxDocument | V2InboxCard): file is V2InboxCard {
  return 'hasTitle' in file && 'bucket' in file && 'raw' in file
}

export const useInboxStore = defineStore('inbox', () => {
  const cards = ref<InboxCard[]>([])
  const loading = ref(false)

  async function loadCards() {
    loading.value = true
    try {
      const files = await (window.electronAPI?.v2?.listCards?.() ?? window.electronAPI?.listInbox())
      cards.value = (files || [])
        .map((f: InboxDocument | V2InboxCard) => {
          if (isV2InboxCard(f)) {
            const title = f.title || extractMarkdownCardTitle(f.raw)
            return {
              slug: f.slug,
              type: f.kind,
              title,
              hasTitle: Boolean(title),
              preview: (f.preview || extractMarkdownPreview(f.raw)).slice(0, 180),
              tags: [],
              enrichStatus: 'none',
              bucket: f.bucket,
              created: f.created || f.createdAt?.split('T')[0] || '',
              raw: f.raw,
            }
          }

          return {
            slug: f.slug,
            type: f.type,
            title: resolveDisplayTitle(f.frontmatter, f.body, f.slug),
            hasTitle: Boolean(extractMarkdownCardTitle(f.raw || f.body)),
            preview: getPreviewText(f.body).slice(0, 180),
            tags: [],
            enrichStatus: 'none',
            bucket: getDocumentBucket(f.frontmatter),
            created: typeof f.frontmatter?.created === 'string' ? f.frontmatter.created : (f.created?.split('T')[0] || ''),
            raw: f.raw,
          }
        })
    } finally {
      loading.value = false
    }
  }

  async function readCard(slug: string): Promise<InboxDocument | null> {
    return await window.electronAPI?.readFile(slug) ?? null
  }

  async function updateCard(slug: string, data: any) {
    await window.electronAPI?.updateFile(slug, data)
    await loadCards()
  }

  async function archiveCard(slug: string) {
    await window.electronAPI?.archiveFile(slug)
    await loadCards()
  }

  async function enrichCard(slug: string) {
    await window.electronAPI?.enrichFile(slug)
    await loadCards()
  }

  async function setCardBucket(slug: string, bucket: DocumentBucket) {
    await window.electronAPI?.setBucket(slug, bucket)
    await loadCards()
  }

  async function toggleCollected(slug: string, collected: boolean) {
    await setCardBucket(slug, collected ? 'collected' : 'inbox')
  }

  async function restoreCard(slug: string) {
    await setCardBucket(slug, 'inbox')
  }

  async function deleteCard(slug: string) {
    await setCardBucket(slug, 'deleted')
  }

  return {
    cards,
    loading,
    loadCards,
    readCard,
    updateCard,
    archiveCard,
    enrichCard,
    setCardBucket,
    toggleCollected,
    restoreCard,
    deleteCard,
  }
})
