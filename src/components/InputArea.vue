<template>
  <div class="input-area">
    <textarea
      v-model="input"
      :placeholder="placeholder"
      @keydown.enter.exact.prevent="submit"
      rows="3"
    ></textarea>
    <div class="hint">按回车发送 · todo / 研究 / 记录 前缀识别</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const emit = defineEmits<{ submit: [input: { type: string; content: string }] }>()
const input = ref('')

const placeholder = '输入文字、粘贴链接或图片...'

function submit() {
  if (!input.value.trim()) return
  const content = input.value.trim()
  let type = 'note'

  if (content.startsWith('todo ')) { type = 'todo'; }
  else if (content.startsWith('研究 ')) { type = 'research'; }
  else if (content.startsWith('记录 ')) { type = 'note'; }
  else if (content.startsWith('http')) { type = 'link'; }

  emit('submit', { type, content })
  input.value = ''
}
</script>

<style scoped>
.input-area { margin-bottom: 24px; }
textarea {
  width: 100%; padding: 12px; border: 1px solid var(--bg-tertiary);
  border-radius: var(--radius-lg); background: var(--bg-secondary);
  color: var(--text-primary); font-size: 14px; resize: none;
  font-family: inherit;
}
textarea:focus { outline: none; border-color: var(--color-link); }
.hint {
  margin-top: 6px; font-size: 12px; color: var(--text-muted);
}
</style>
