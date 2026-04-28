export type V2CardKind = 'note' | 'todo'
export type V2CardBucket = 'inbox' | 'collected' | 'deleted'

export interface CardMetadataFile {
  version: 1
  items: Record<string, CardMetadata>
}

export interface CardMetadata {
  kind: V2CardKind
  bucket: V2CardBucket
  createdAt: string
  updatedAt: string
}

export interface V2InboxCard {
  id: string
  slug: string
  filename: string
  path: string
  title: string
  hasTitle: boolean
  preview: string
  kind: V2CardKind
  type: V2CardKind
  bucket: V2CardBucket
  createdAt: string
  updatedAt: string
  created: string
  raw: string
  tags: string[]
}

export interface V2CaptureResult {
  slug: string
  filename: string
  path: string
  documentType: V2CardKind
  parseMode: 'deterministic'
}
