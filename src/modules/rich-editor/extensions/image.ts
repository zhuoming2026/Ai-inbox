import { Image as TiptapImage } from '@tiptap/extension-image'

export const ImageExtension = TiptapImage.configure({
  inline: false,
  allowBase64: true,
  HTMLAttributes: {
    loading: 'lazy',
  },
})
