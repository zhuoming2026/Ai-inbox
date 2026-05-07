<template>
  <div class="week-calendar">
    <!-- Calendar Header -->
    <div class="calendar-header">
      <div class="calendar-date">{{ formattedDate }}</div>
      <div class="header-spacer"></div>
      <button class="icon-btn close-btn" @click="handleClear">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <button class="icon-btn today-btn" @click="handleToday">今</button>
    </div>

    <!-- Week View -->
    <div class="calendar-week">
      <div
        v-for="(col, index) in weekColumns"
        :key="index"
        class="calendar-column"
        :class="{ 'is-selected': col.isSelected }"
        @click="selectDate(col.date)"
      >
        <span class="calendar-weekday">{{ col.weekday }}</span>
        <span class="calendar-number" :class="{ 'is-selected': col.isSelected, 'is-other-month': col.isOtherMonth }">
          {{ col.day }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  selectedDate?: number
}>()

const emit = defineEmits<{
  (e: 'select', date: number): void
  (e: 'clear'): void
}>()

const weekStart = ref(getWeekStart(new Date()))
const refreshTrigger = ref(0)

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekColumns(ws: Date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const columns = []
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  for (let i = 0; i < 7; i++) {
    const d = new Date(ws)
    d.setDate(ws.getDate() + i)
    columns.push({
      date: d.getTime(),
      day: d.getDate(),
      weekday: weekdays[i],
      isToday: d.toDateString() === today.toDateString(),
      isOtherMonth: d.getMonth() !== today.getMonth(),
      isSelected: props.selectedDate && new Date(props.selectedDate).toDateString() === d.toDateString()
    })
  }
  return columns
}

const weekColumns = computed(() => {
  refreshTrigger.value
  return getWeekColumns(weekStart.value)
})

const formattedDate = computed(() => {
  if (!props.selectedDate) {
    const today = new Date()
    return `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  }
  const d = new Date(props.selectedDate)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

function selectDate(date: number) {
  emit('select', date)
}

function handleClear() {
  emit('clear')
}

function handleToday() {
  weekStart.value = getWeekStart(new Date())
  emit('select', Date.now())
}

watch(() => props.selectedDate, (newDate) => {
  refreshTrigger.value++
  if (newDate) {
    const selected = new Date(newDate)
    const newWeekStart = getWeekStart(selected)
    if (newWeekStart.toDateString() !== weekStart.value.toDateString()) {
      weekStart.value = newWeekStart
    }
  }
})
</script>

<style scoped>
.week-calendar {
  display: flex;
  flex-direction: column;
  padding: 0;
  width: 100%;
}

.calendar-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 0;
  margin-bottom: var(--space-5);
  margin-left: 0;
  margin-right: 0;
  font-family: var(--font-body);
}

.calendar-date {
  font-family: var(--font-body);
  font-size: var(--text-2xl);
  color: var(--text-secondary);
  user-select: none;
}

.header-spacer {
  flex: 1;
}

.icon-btn {
  --btn-size: 28px;
  --btn-bg: transparent;
  --btn-border: var(--border-color);
  --btn-color: var(--text-primary);
  --btn-border-hover: var(--color-primary);
  --btn-color-hover: var(--color-primary);

  width: var(--btn-size);
  height: var(--btn-size);
  border-radius: 50%;
  border: 1px solid var(--btn-border);
  background: var(--btn-bg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  color: var(--btn-color);
  margin-left: var(--space-2);
  transition: all var(--transition);
}

.icon-btn:hover {
  border-color: var(--btn-border-hover);
  color: var(--btn-color-hover);
}

.close-btn {
  --btn-size: 28px;
  --btn-bg: var(--color-primary);
  --btn-border: var(--color-primary);
  --btn-color: var(--text-inverse);
  --btn-border-hover: var(--color-primary-hover);
  --btn-color-hover: var(--text-inverse);
}

.today-btn {
  font-size: var(--text-sm);
  font-weight: 500;
}

.calendar-week {
  display: flex;
  justify-content: space-between;
  flex: 1;
  margin-left: 0px;
  margin-right: 0px;
}

.calendar-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  cursor: pointer;
}

.calendar-weekday {
  font-family: var(--font-body);
  font-size: var(--text-xl);
  color: var(--text-primary);
}

.calendar-number {
  font-family: var(--font-body);
  font-size: var(--text-lg);
  font-weight: 400;
  color: var(--text-primary);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all var(--transition);
}

.calendar-number:hover {
  background: var(--border-color);
}

.calendar-number.is-selected {
  background: var(--calendar-cell-selected-bg);
  color: var(--calendar-cell-selected-text);
  font-weight: 600;
}

.calendar-number.is-other-month {
  opacity: 0.3;
}
</style>
