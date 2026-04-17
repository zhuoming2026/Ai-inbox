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
  font-size: 12px; color: var(--text-muted); margin: var(--space-4) 0 var(--space-2);
  text-transform: uppercase; letter-spacing: 0.5px;
}
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-3); }
.card {
  display: flex; border-radius: var(--radius-lg); overflow: hidden;
  background: var(--bg-card); cursor: pointer;
  transition: transform var(--transition-base), box-shadow var(--transition-base);
  box-shadow: var(--shadow-card);
}
.card:hover { transform: translateY(-4px); box-shadow: var(--shadow-card-hover); }
.card-bar { width: 3px; background: var(--card-color); flex-shrink: 0; }
.card-body { padding: var(--space-3); flex: 1; }
.card-title { font-size: 14px; font-weight: 500; margin-bottom: var(--space-1); font-family: var(--font-mono); }
.card-preview {
  font-size: 12px; color: var(--text-secondary); margin-bottom: var(--space-2);
  overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-family: var(--font-mono);
}
.card-meta { display: flex; gap: var(--space-1); margin-bottom: var(--space-2); }
.card-meta span {
  font-size: 10px; padding: var(--space-1) var(--space-2); border-radius: var(--radius-sm);
  background: var(--bg-embedded); color: var(--text-muted); font-family: var(--font-mono);
}
.card-meta span.active { background: var(--color-link); color: white; }
.card-date { font-size: 11px; color: var(--text-muted); }
</style>
