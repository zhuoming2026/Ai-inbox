import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface InboxCard {
  slug: string
  type: string
  title: string
  preview: string
  status: string
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
      cards.value = (files || []).map((f: any) => ({
        slug: f.slug,
        type: f.type,
        title: f.frontmatter?.title || f.slug,
        preview: f.body?.slice(0, 100) || '',
        status: f.frontmatter?.status || 'ready',
        created: f.frontmatter?.created || f.created?.split('T')[0] || ''
      }))
    } finally {
      loading.value = false
    }
  }

  async function readCard(slug: string): Promise<string | null> {
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

  async function deleteCard(slug: string) {
    await window.electronAPI?.deleteFile(slug)
    await loadCards()
  }

  return { cards, loading, loadCards, readCard, updateCard, archiveCard, deleteCard }
})
