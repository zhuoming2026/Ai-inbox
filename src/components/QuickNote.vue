<template>
  <div class="quick-note">
    <textarea v-model="note" placeholder="随手记..." @blur="save"></textarea>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const note = ref('')

async function save() {
  if (!note.value.trim()) return
  // Save to localStorage for now; can be upgraded to file
  localStorage.setItem('quick-note', note.value)
}
</script>

<style scoped>
.quick-note textarea {
  width: 100%; height: 200px; padding: 12px;
  border: 1px solid var(--bg-tertiary); border-radius: var(--radius-md);
  background: var(--bg-secondary); color: var(--text-primary);
  font-size: 14px; resize: none; font-family: inherit;
}
.quick-note textarea:focus { outline: none; border-color: var(--color-link); }
</style>
