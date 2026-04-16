<template>
  <div class="milkdown-editor" ref="editorRef"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { nord } from '@milkdown/theme-nord'
import { VueEditor, useVueEditor } from '@milkdown/vue'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const editorRef = ref<HTMLElement | null>(null)
let editor: Editor | null = null

onMounted(async () => {
  if (!editorRef.value) return

  editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, editorRef.value)
      ctx.set(defaultValueCtx, props.modelValue || '')
    })
    .use(commonmark)
    .use(nord)
    .create()
})

onBeforeUnmount(() => {
  editor?.destroy()
})

watch(() => props.modelValue, (newVal) => {
  // Update editor content if external change
})
</script>

<style>
.milkdown-editor {
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.milkdown-editor .milkdown {
  width: 100%;
  height: 100%;
}
</style>
