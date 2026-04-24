import { type Ref, ref, watch, onBeforeUnmount } from 'vue'
import {
  computePosition,
  autoUpdate,
  offset,
  flip,
  shift,
} from '@floating-ui/dom'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMiddleware = any
import type { Editor } from '@tiptap/core'
import type { Placement, Middleware } from '@floating-ui/dom'

export interface UseFloatingPositionOptions {
  editor: Editor
  floatingRef: Ref<HTMLElement | null>
  /** Return the anchor rect from ProseMirror coordsAtPos. Return null to hide. */
  getAnchorRect: () => DOMRect | null
  /** Preferred placement. @default 'top' */
  placement?: Placement | (() => Placement)
  /** Additional middleware. */
  middleware?: Middleware[]
  /** Distance from anchor in px. @default 8 */
  offsetValue?: number
}

export interface UseFloatingPositionReturn {
  position: Ref<{ left: number; top: number } | null>
}

export function useEditorFloatingPosition(
  options: UseFloatingPositionOptions,
): UseFloatingPositionReturn {
  const {
    floatingRef,
    getAnchorRect,
    placement = 'top',
    middleware: extraMiddleware = [],
    offsetValue = 8,
  } = options

  const position = ref<{ left: number; top: number } | null>(null)
  let cleanup: (() => void) | null = null

  const resolvePlacement = () =>
    typeof placement === 'function' ? placement() : placement

  const virtualElement = {
    getBoundingClientRect() {
      return getAnchorRect() ?? new DOMRect(0, 0, 0, 0)
    },
    contextElement: options.editor.view.dom,
  }

  function compute() {
    const floating = floatingRef.value
    const rect = getAnchorRect()

    if (!floating || !rect) {
      position.value = null
      return
    }

    computePosition(virtualElement, floating, {
      placement: resolvePlacement(),
      middleware: [
        offset(offsetValue) as AnyMiddleware,
        flip({
          fallbackPlacements: ['bottom', 'top-start', 'top-end', 'bottom-start', 'bottom-end'],
        }) as AnyMiddleware,
        shift({ padding: 8 }) as AnyMiddleware,
        ...(extraMiddleware as AnyMiddleware[]),
      ],
    }).then((result) => {
      position.value = { left: result.x, top: result.y }
    })
  }

  const stopWatch = watch(
    floatingRef,
    (el) => {
      cleanup?.()
      cleanup = null

      if (el) {
        cleanup = autoUpdate(virtualElement, el, compute, {
          ancestorScroll: true,
          ancestorResize: true,
          elementResize: true,
          layoutShift: true,
        })
        compute()
      } else {
        position.value = null
      }
    },
    { immediate: true },
  )

  const update = () => compute()

  options.editor.on('selectionUpdate', update)
  options.editor.on('transaction', update)
  options.editor.on('focus', update)
  options.editor.on('blur', update)

  onBeforeUnmount(() => {
    stopWatch()
    options.editor.off('selectionUpdate', update)
    options.editor.off('transaction', update)
    options.editor.off('focus', update)
    options.editor.off('blur', update)
    cleanup?.()
  })

  return { position }
}
