import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { InboxDocument } from '../shared/inbox-document'
import { getDocumentBucket, getDocumentTags, getPreviewText } from '../shared/inbox-document'

export interface InboxCard {
  slug: string
  type: string
  title: string
  preview: string
  tags: string[]
  enrichStatus: string
  bucket: string
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
        .filter((f: InboxDocument) => getDocumentBucket(f.frontmatter) !== 'deleted')
        .map((f: InboxDocument) => ({
          slug: f.slug,
          type: f.type,
          title: typeof f.frontmatter?.title === 'string' ? f.frontmatter.title : f.slug,
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

  async function toggleCollected(slug: string, collected: boolean) {
    await window.electronAPI?.setBucket(slug, collected ? 'collected' : 'inbox')
    await loadCards()
  }

  async function deleteCard(slug: string) {
    await window.electronAPI?.deleteFile(slug)
    await loadCards()
  }

  return { cards, loading, loadCards, readCard, updateCard, archiveCard, enrichCard, toggleCollected, deleteCard }
})
