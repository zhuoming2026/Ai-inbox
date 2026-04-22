import { Extension } from '@tiptap/core'
import { Suggestion as TipTapSuggestion } from '@tiptap/suggestion'
import type { SuggestionMenuItem } from '../types/editor'
import { suggestionMenuItems } from '../config/suggestion-menu'

export interface SlashCommandOptions {
  onTrigger?: (range: { from: number; to: number }, query: string) => void
  onQueryUpdate?: (query: string) => void
  onClose?: () => void
  onExecute?: (item: SuggestionMenuItem) => void
  onKeyDown?: (props: { event: KeyboardEvent }) => boolean
}

/**
 * Creates a TipTap Extension that implements `/` slash commands using
 * @tiptap/suggestion.  The `editor` instance is accessed via `this.editor`
 * (set by TipTap's ExtensionManager when calling addProseMirrorPlugins).
 */
export function createSlashCommand(options: SlashCommandOptions) {
  return Extension.create({
    name: 'slashCommand',
    addOptions() {
      return options
    },

    addProseMirrorPlugins() {
      const { onTrigger, onQueryUpdate, onClose, onExecute, onKeyDown } = this.options
      // `this.editor` is available here — TipTap's ExtensionManager binds
      // `this` to { editor, name, options, storage, type, parent } when
      // calling addProseMirrorPlugins().
      const editor = this.editor

      return [
        TipTapSuggestion({
          editor,
          char: '/',
          allowSpaces: false,
          startOfLine: false,

          items: ({ query }) => {
            const q = query.toLowerCase().trim()
            if (!q) return suggestionMenuItems
            return suggestionMenuItems.filter((item) => {
              const matchLabel = item.label.toLowerCase().includes(q)
              const matchKeywords = item.keywords?.some((kw) => kw.includes(q)) ?? false
              return matchLabel || matchKeywords
            })
          },

          render: () => {
            return {
              onStart: (props) => {
                onTrigger?.({ from: props.range.from, to: props.range.to }, props.query)
              },
              onUpdate: (props) => {
                onQueryUpdate?.(props.query)
              },
              onKeyDown: (props) => {
                return onKeyDown?.({ event: props.event }) ?? false
              },
              onExit: () => {
                onClose?.()
              },
            }
          },

          command: ({ editor: ed, range, props }) => {
            ed.chain().focus().deleteRange(range).run()
            if (onExecute) {
              onExecute(props as SuggestionMenuItem)
            }
          },
        }),
      ]
    },
  })
}
