<template>
  <div class="week-calendar">
    <!-- Calendar Header -->
    <div class="calendar-header">
      <div class="calendar-date">{{ formattedDate }}</div>
      <div class="header-spacer"></div>
      <button class="icon-btn close-btn" @click="handleClear">×</button>
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

// 当选中日期不在当前周时，更新周视图
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
  width: auto;
  margin-top: var(--space-6);
  margin-bottom: var(--space-6);
  margin-left: 0;
  margin-right: 0;
  font-family: var(--font-body);
}

.calendar-date {
  font-family: var(--font-body);
  font-size: 24px;
  color: var(--text-secondary);
  user-select: none;
}

.header-spacer {
  flex: 1;
}

.icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--text-primary);
  margin-left: var(--space-2);
  transition: all var(--transition-base);
}

.icon-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.close-btn {
  font-size: 16px;
  font-weight: bold;
}

.today-btn {
  font-size: 14px;
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
  font-size: 22px;
  color: var(--text-primary);
}

.calendar-number {
  font-family: var(--font-body);
  font-size: 20px;
  font-weight: 400;
  color: var(--text-primary);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all var(--transition-base);
}

.calendar-number:hover {
  background: var(--border-color);
}

.calendar-number.is-selected {
  color: var(--color-primary);
  font-weight: 600;
}

.calendar-number.is-other-month {
  opacity: 0.3;
}
</style>