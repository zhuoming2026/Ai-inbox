import type { CardMetadata, CardMetadataFile, V2CardBucket, V2CardKind } from './v2-types'

export function createEmptyCardMetadataFile(): CardMetadataFile {
  return {
    version: 1,
    items: {},
  }
}

export function normalizeCardMetadataFile(value: unknown): CardMetadataFile {
  if (!value || typeof value !== 'object') return createEmptyCardMetadataFile()

  const candidate = value as Partial<CardMetadataFile>
  const items = candidate.items && typeof candidate.items === 'object' ? candidate.items : {}

  return {
    version: 1,
    items: Object.fromEntries(
      Object.entries(items).flatMap(([key, item]) => {
        const normalized = normalizeCardMetadata(item)
        return normalized ? [[key, normalized]] : []
      })
    ),
  }
}

export function normalizeCardMetadata(value: unknown): CardMetadata | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Partial<CardMetadata>
  const kind: V2CardKind = item.kind === 'todo' ? 'todo' : 'note'
  const bucket: V2CardBucket =
    item.bucket === 'collected' || item.bucket === 'deleted' ? item.bucket : 'inbox'
  const createdAt = typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString()
  const updatedAt = typeof item.updatedAt === 'string' ? item.updatedAt : createdAt

  return {
    kind,
    bucket,
    createdAt,
    updatedAt,
  }
}

export function createDefaultCardMetadata(params: {
  kind?: V2CardKind
  createdAt: string
  updatedAt?: string
}): CardMetadata {
  return {
    kind: params.kind || 'note',
    bucket: 'inbox',
    createdAt: params.createdAt,
    updatedAt: params.updatedAt || params.createdAt,
  }
}
