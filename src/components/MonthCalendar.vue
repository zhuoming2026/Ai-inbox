<template>
  <div class="month-calendar">
    <div class="calendar-toolbar">
      <button class="icon-btn" @click="goToPreviousMonth" aria-label="Previous month">‹</button>
      <div v-if="!hideMonthLabel" class="calendar-month">{{ formattedMonth }}</div>
      <button class="icon-btn" @click="goToNextMonth" aria-label="Next month">›</button>
      <div class="toolbar-spacer"></div>
      <button v-if="showTodayButton" class="text-btn today-btn" @click="goToToday">Today</button>
    </div>

    <div class="calendar-weekdays">
      <span v-for="weekday in weekdays" :key="weekday" class="weekday">{{ weekday }}</span>
    </div>

    <div class="calendar-grid">
      <button
        v-for="cell in cells"
        :key="cell.key"
        class="calendar-cell"
        :class="{
          'is-other-month': !cell.isCurrentMonth,
          'is-selected': cell.isSelected,
          'is-today': cell.isToday,
          'has-items': cell.hasItems,
        }"
        @click="selectDate(cell.date)"
      >
        <span class="cell-number">{{ cell.day }}</span>
        <span v-if="cell.hasItems" class="cell-dot"></span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  selectedDate?: number
  markedDates?: string[]
  hideMonthLabel?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', date: number): void
  (e: 'month-change', monthStart: number): void
}>()

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const visibleMonth = ref(getMonthStart(props.selectedDate ? new Date(props.selectedDate) : new Date()))

function getMonthStart(date: Date) {
  const next = new Date(date)
  next.setDate(1)
  next.setHours(0, 0, 0, 0)
  return next
}

function getCalendarStart(date: Date) {
  const next = getMonthStart(date)
  next.setDate(next.getDate() - next.getDay())
  return next
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const markedDateSet = computed(() => new Set(props.markedDates || []))
const showTodayButton = computed(() => {
  if (!props.selectedDate) return false
  const selected = new Date(props.selectedDate)
  const today = new Date()
  selected.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return selected.getTime() !== today.getTime()
})

const cells = computed(() => {
  const start = getCalendarStart(visibleMonth.value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const key = formatDateKey(date)
    return {
      key,
      date: date.getTime(),
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === visibleMonth.value.getMonth(),
      isToday: date.toDateString() === today.toDateString(),
      isSelected: props.selectedDate ? new Date(props.selectedDate).toDateString() === date.toDateString() : false,
      hasItems: markedDateSet.value.has(key),
    }
  })
})

const formattedMonth = computed(() => {
  return `${visibleMonth.value.getFullYear()}-${String(visibleMonth.value.getMonth() + 1).padStart(2, '0')}`
})

function goToPreviousMonth() {
  const next = new Date(visibleMonth.value)
  next.setMonth(next.getMonth() - 1)
  visibleMonth.value = getMonthStart(next)
  emit('month-change', visibleMonth.value.getTime())
}

function goToNextMonth() {
  const next = new Date(visibleMonth.value)
  next.setMonth(next.getMonth() + 1)
  visibleMonth.value = getMonthStart(next)
  emit('month-change', visibleMonth.value.getTime())
}

function goToToday() {
  const today = new Date()
  visibleMonth.value = getMonthStart(today)
  emit('month-change', visibleMonth.value.getTime())
  emit('select', today.getTime())
}

function selectDate(timestamp: number) {
  emit('select', timestamp)
}

watch(
  () => props.selectedDate,
  (selectedDate) => {
    if (!selectedDate) return
    const selected = new Date(selectedDate)
    const monthStart = getMonthStart(selected)
    if (monthStart.toDateString() !== visibleMonth.value.toDateString()) {
      visibleMonth.value = monthStart
      emit('month-change', visibleMonth.value.getTime())
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.month-calendar {
  width: 100%;
  overflow: hidden;
}

.calendar-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.calendar-month {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--text-primary);
}

.toolbar-spacer {
  flex: 1;
}

.icon-btn,
.text-btn {
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-base);
}

.icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.text-btn {
  border-radius: 999px;
  padding: 0 10px;
  height: 28px;
  flex-shrink: 0;
  font-size: 12px;
}

.icon-btn:hover,
.text-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.today-btn {
  color: var(--color-primary);
  border-color: rgba(250, 187, 24, 0.3);
  background: rgba(250, 187, 24, 0.08);
}

.calendar-weekdays,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  width: 100%;
}

.calendar-weekdays {
  margin-bottom: 6px;
}

.weekday {
  text-align: center;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.calendar-cell {
  aspect-ratio: 1;
  min-width: 0;
  border: 1px solid transparent;
  border-radius: 16px;
  background: transparent;
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  transition: all var(--transition-base);
}

.calendar-cell:hover {
  background: rgba(250, 187, 24, 0.12);
}

.calendar-cell.is-other-month {
  opacity: 0.28;
}

.calendar-cell.is-selected {
  background: rgba(250, 187, 24, 0.16);
  border-color: rgba(250, 187, 24, 0.35);
}

.calendar-cell.is-today .cell-number {
  color: var(--color-primary);
  font-weight: 700;
}

.calendar-cell.has-items .cell-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-primary);
}
</style>
