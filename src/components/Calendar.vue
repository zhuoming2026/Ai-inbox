<template>
  <div class="calendar">
    <div class="cal-header">
      <button @click="prevMonth">◀</button>
      <span>{{ year }}年{{ month + 1 }}月</span>
      <button @click="nextMonth">▶</button>
      <button class="today" @click="goToday">today</button>
    </div>
    <div class="cal-weekdays">
      <span v-for="d in ['日','一','二','三','四','五','六']" :key="d">{{ d }}</span>
    </div>
    <div class="cal-grid">
      <span
        v-for="(day, i) in days"
        :key="i"
        :class="{
          'other-month': !day.currentMonth,
          'is-today': day.isToday,
          'is-selected': day.dateStr === selected
        }"
        @click="day.currentMonth && select(day.dateStr)"
      >{{ day.day }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{ selected: string | null }>()
const emit = defineEmits<{ select: [date: string] }>()

const today = new Date()
const year = ref(today.getFullYear())
const month = ref(today.getMonth())

const days = computed(() => {
  const firstDay = new Date(year.value, month.value, 1).getDay()
  const daysInMonth = new Date(year.value, month.value + 1, 0).getDate()
  const prevDays = new Date(year.value, month.value, 0).getDate()
  const result: any[] = []

  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevDays - i
    const date = new Date(year.value, month.value - 1, d)
    result.push({ day: d, currentMonth: false, isToday: false, dateStr: fmt(date) })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year.value, month.value, d)
    const isToday = year.value === today.getFullYear() &&
      month.value === today.getMonth() && d === today.getDate()
    result.push({ day: d, currentMonth: true, isToday, dateStr: fmt(date) })
  }
  const remaining = 42 - result.length
  for (let d = 1; d <= remaining; d++) {
    const date = new Date(year.value, month.value + 1, d)
    result.push({ day: d, currentMonth: false, isToday: false, dateStr: fmt(date) })
  }
  return result
})

function fmt(d: Date) {
  return d.toISOString().split('T')[0]
}

function select(dateStr: string) {
  emit('select', props.selected === dateStr ? '' : dateStr)
}

function prevMonth() {
  if (month.value === 0) { month.value = 11; year.value-- }
  else month.value--
}

function nextMonth() {
  if (month.value === 11) { month.value = 0; year.value++ }
  else month.value++
}

function goToday() {
  year.value = today.getFullYear()
  month.value = today.getMonth()
  emit('select', fmt(today))
}
</script>

<style scoped>
.calendar { margin-bottom: 24px; }
.cal-header {
  display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
}
.cal-header span { flex: 1; font-size: 14px; font-weight: 500; }
.cal-header button {
  border: none; background: var(--bg-tertiary); cursor: pointer;
  padding: 4px 8px; border-radius: var(--radius-sm);
}
.cal-header .today { font-size: 11px; }
.cal-weekdays {
  display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 4px;
}
.cal-weekdays span {
  text-align: center; font-size: 11px; color: var(--text-muted);
}
.cal-grid {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;
}
.cal-grid span {
  text-align: center; padding: 6px 0; font-size: 12px; cursor: pointer;
  border-radius: var(--radius-sm);
}
.cal-grid span:hover { background: var(--bg-tertiary); }
.cal-grid .other-month { color: var(--text-muted); opacity: 0.4; }
.cal-grid .is-today { color: #FABB18; font-weight: 600; }
.cal-grid .is-selected { background: var(--color-link); color: white; }
</style>
