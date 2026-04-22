import { StarterKit } from '@tiptap/starter-kit'

export function createStarterKit(options?: { undoRedo?: boolean }) {
  return StarterKit.configure({
    undoRedo: options?.undoRedo === false ? false : undefined,
  })
}
