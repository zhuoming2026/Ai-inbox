import { Extension } from '@tiptap/core'
import { Suggestion as TipTapSuggestion } from '@tiptap/suggestion'
import { suggestionMenuItems } from '../config/suggestion-menu'

export interface SlashCommandOptions {
  onTrigger?: (range: { from: number; to: number }, query: string) => void
  onQueryUpdate?: (query: string) => void
  onClose?: () => void
  onKeyDown?: (props: { event: KeyboardEvent }) => boolean
}

/**
 * Creates a TipTap Extension that implements `/` slash commands using
 * @tiptap/suggestion.  The `editor` instance is accessed via `this.editor`
 * (set by TipTap's ExtensionManager when calling addProseMirrorPlugins).
 *
 * This extension ONLY handles slash detection and UI state callbacks.
 * All execution (mouse click, Enter, Tab) is handled by useSlashCommand.ts
 * via the executeSelectedItem() function — single execution path.
 */
export function createSlashCommand(options: SlashCommandOptions) {
  return Extension.create({
    name: 'slashCommand',
    addOptions() {
      return options
    },

    addProseMirrorPlugins() {
      const { onTrigger, onQueryUpdate, onClose, onKeyDown } = this.options
      const editor = this.editor

      return [
        TipTapSuggestion({
          editor,
          char: '/',
          allowSpaces: false,
          startOfLine: false,

          // NOTE: No `command` here. Execution is handled by useSlashCommand.ts
          // via RichEditorSuggestionMenu @execute and onSlashKeyDown Enter/Tab.

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
        }),
      ]
    },
  })
}
