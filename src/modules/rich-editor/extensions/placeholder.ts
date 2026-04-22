import { Placeholder } from '@tiptap/extension-placeholder'

export function createPlaceholder(placeholder: string = 'Write, type \'/\' for commands...') {
  return Placeholder.configure({
    placeholder,
    emptyEditorClass: 'is-editor-empty',
  })
}
