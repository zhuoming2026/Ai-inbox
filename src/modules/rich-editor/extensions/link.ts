import { Link as TiptapLink } from '@tiptap/extension-link'

export const LinkExtension = TiptapLink.configure({
  openOnClick: false,
  autolink: true,
  HTMLAttributes: {
    rel: 'noopener noreferrer',
    target: '_blank',
  },
})
