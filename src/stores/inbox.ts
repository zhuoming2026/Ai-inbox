import { defineStore } from 'pinia'
import { ref } from 'vue'
import { extractMarkdownCardTitle, extractMarkdownPreview } from '../shared/v2-markdown'
import type { V2CardBucket, V2CardKind, V2InboxCard } from '../shared/v2-types'

export interface InboxCard {
  slug: string
  filename: string
  type: V2CardKind
  title: string
  hasTitle: boolean
  preview: string
  tags: string[]
  bucket: V2CardBucket
  created: string
  raw?: string
}

export const useInboxStore = defineStore('inbox', () => {
  const cards = ref<InboxCard[]>([])
  const loading = ref(false)

  async function loadCards() {
    loading.value = true
    try {
      const files = await (window.electronAPI?.v2?.listCards?.() ?? window.electronAPI?.listInbox())
      cards.value = ((files || []) as V2InboxCard[])
        .map((f) => {
          const title = extractMarkdownCardTitle(f.raw)
          return {
            slug: f.slug,
            filename: f.filename || `${f.slug}.md`,
            type: f.kind,
            title,
            hasTitle: Boolean(title),
            preview: extractMarkdownPreview(f.raw).slice(0, 180),
            tags: [],
            bucket: f.bucket,
            created: f.created || f.createdAt?.split('T')[0] || '',
            raw: f.raw,
          }
        })
    } finally {
      loading.value = false
    }
  }

  async function readCard(slug: string) {
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

  async function setCardBucket(slug: string, bucket: V2CardBucket) {
    const filename = slug.endsWith('.md') ? slug : `${slug}.md`
    if (window.electronAPI?.v2?.setCardBucket) {
      await window.electronAPI.v2.setCardBucket(filename, bucket)
    } else {
      await window.electronAPI?.setBucket(slug, bucket)
    }
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
    setCardBucket,
    toggleCollected,
    restoreCard,
    deleteCard,
  }
})
