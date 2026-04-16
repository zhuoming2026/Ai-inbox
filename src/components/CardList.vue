<template>
  <div class="card-list">
    <template v-for="(group, date) in groupedCards" :key="date">
      <h3 class="date-label">{{ date }}</h3>
      <div class="cards">
        <div
          v-for="card in group"
          :key="card.slug"
          class="card"
          :style="{ '--card-color': colorMap[card.type] }"
          @click="$emit('card-click', card.slug)"
        >
          <div class="card-bar"></div>
          <div class="card-body">
            <div class="card-title">{{ card.title }}</div>
            <div class="card-preview">{{ card.preview }}</div>
            <div class="card-meta">
              <span
                v-for="s in ['ready', 'working', 'finished']"
                :key="s"
                :class="{ active: card.status === s }"
              >{{ s }}</span>
            </div>
            <div class="card-date">{{ card.created }}</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Card {
  slug: string
  type: string
  title: string
  preview: string
  status: string
  created: string
}

const props = defineProps<{ cards: Card[] }>()
defineEmits<{ 'card-click': [slug: string] }>()

const colorMap: Record<string, string> = {
  todo: '#097FE8', link: '#097FE8', note: '#FABB18',
  research: '#FABB18', image: '#3C9BE0', source: '#DADADA'
}

const groupedCards = computed(() => {
  const groups: Record<string, Card[]> = {}
  for (const card of props.cards) {
    const date = card.created
    if (!groups[date]) groups[date] = []
    groups[date].push(card)
  }
  return groups
})
</script>

<style scoped>
.card-list { }
.date-label {
  font-size: 12px; color: var(--text-muted); margin: 16px 0 8px;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.card {
  display: flex; border-radius: var(--radius-lg); overflow: hidden;
  background: var(--bg-secondary); cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}
.card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.card-bar { width: 3px; background: var(--card-color); flex-shrink: 0; }
.card-body { padding: 12px; flex: 1; }
.card-title { font-size: 14px; font-weight: 500; margin-bottom: 4px; }
.card-preview {
  font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;
  overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
}
.card-meta { display: flex; gap: 4px; margin-bottom: 6px; }
.card-meta span {
  font-size: 10px; padding: 2px 6px; border-radius: var(--radius-sm);
  background: var(--bg-tertiary); color: var(--text-muted);
}
.card-meta span.active { background: var(--color-link); color: white; }
.card-date { font-size: 11px; color: var(--text-muted); }
</style>
