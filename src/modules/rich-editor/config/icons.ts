import {
  ArrowRedoOutline,
  ArrowUndoOutline,
  CheckboxOutline,
  ChatboxEllipsesOutline,
  CodeSlashOutline,
  GridOutline,
  ImageOutline,
  LinkOutline,
  ListCircleOutline,
  ListOutline,
  OpenOutline,
  RemoveOutline,
  ReturnDownBackOutline,
  TextOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import type { EditorToolbarItem, SuggestionMenuItem } from '../types/editor'

type ItemLike = Pick<EditorToolbarItem, 'kind' | 'label'> | Pick<SuggestionMenuItem, 'kind' | 'label'>

const iconMap = {
  undo: ArrowUndoOutline,
  redo: ArrowRedoOutline,
  paragraph: TextOutline,
  'bullet-list': ListOutline,
  'ordered-list': ListCircleOutline,
  'task-list': CheckboxOutline,
  blockquote: ChatboxEllipsesOutline,
  'code-block': CodeSlashOutline,
  'horizontal-rule': RemoveOutline,
  table: GridOutline,
  link: LinkOutline,
  image: ImageOutline,
} as const

export function resolveEditorIcon(item: ItemLike) {
  if (!item.kind) return null
  return iconMap[item.kind as keyof typeof iconMap] ?? null
}

export function resolveEditorTextFallback(item: ItemLike) {
  switch (item.kind) {
    case 'heading-1':
      return 'H1'
    case 'heading-2':
      return 'H2'
    case 'heading-3':
      return 'H3'
    case 'bold':
      return 'B'
    case 'italic':
      return 'I'
    case 'underline':
      return 'U'
    case 'strike':
      return 'S'
    case 'code':
      return '</>'
    default:
      return item.label.slice(0, 2).toUpperCase()
  }
}

export const linkPopoverIcons = {
  apply: ReturnDownBackOutline,
  open: OpenOutline,
  remove: TrashOutline,
}
