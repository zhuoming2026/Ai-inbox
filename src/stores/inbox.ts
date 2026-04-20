import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { InboxDocument } from '../shared/inbox-document'
import { getPreviewText } from '../shared/inbox-document'

export interface InboxCard {
  slug: string
  type: string
  title: string
  preview: string
  enrichStatus: string
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
        .filter((f: InboxDocument) => f.frontmatter?.status !== 'deleted')
        .map((f: InboxDocument) => ({
        slug: f.slug,
        type: f.type,
        title: typeof f.frontmatter?.title === 'string' ? f.frontmatter.title : f.slug,
        preview: getPreviewText(f.body).slice(0, 100),
        enrichStatus: typeof f.frontmatter?.enrichStatus === 'string' ? f.frontmatter.enrichStatus : 'none',
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

  async function deleteCard(slug: string) {
    await window.electronAPI?.deleteFile(slug)
    await loadCards()
  }

  return { cards, loading, loadCards, readCard, updateCard, archiveCard, enrichCard, deleteCard }
})
