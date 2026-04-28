import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { InboxDocument } from '../shared/inbox-document'
import {
  getDocumentBucket,
  getDocumentTags,
  resolveDisplayTitle,
  getPreviewText,
  type DocumentBucket,
} from '../shared/inbox-document'

export interface InboxCard {
  slug: string
  type: string
  title: string
  preview: string
  tags: string[]
  enrichStatus: string
  bucket: DocumentBucket
  created: string
  raw?: string
}

export const useInboxStore = defineStore('inbox', () => {
  const cards = ref<InboxCard[]>([])
  const loading = ref(false)

  async function loadCards() {
    loading.value = true
    try {
      const files = await window.electronAPI?.listInbox()
      cards.value = (files || [])
        .map((f: InboxDocument) => ({
          slug: f.slug,
          type: f.type,
          title: resolveDisplayTitle(f.frontmatter, f.body, f.slug),
          preview: getPreviewText(f.body).slice(0, 180),
          tags: getDocumentTags(f.frontmatter),
          enrichStatus: typeof f.frontmatter?.enrichStatus === 'string' ? f.frontmatter.enrichStatus : 'none',
          bucket: getDocumentBucket(f.frontmatter),
          created: typeof f.frontmatter?.created === 'string' ? f.frontmatter.created : (f.created?.split('T')[0] || '')
        }))
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
