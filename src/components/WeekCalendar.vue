<template>
  <div class="week-calendar">
    <!-- Week View -->
    <div class="calendar-week">
      <div
        v-for="(col, index) in weekColumns"
        :key="index"
        class="calendar-column"
        :class="{ 'is-today': col.isToday }"
        @click="selectDate(col.date)"
      >
        <span class="calendar-weekday">{{ col.weekday }}</span>
        <span class="calendar-number" :class="{ 'is-other-month': col.isOtherMonth }">
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

const weekColumns = computed(() => getWeekColumns(weekStart.value))

function selectDate(date: number) {
  emit('select', date)
}

// 当选中日期不在当前周时，更新周视图
watch(() => props.selectedDate, (newDate) => {
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
  display: block;
  padding: 52px 11px 53px;
  width: 100%;
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
  gap: 20px;
  cursor: pointer;
}

.calendar-weekday {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
  font-size: 22px;
  color: #000;
}

.calendar-column.is-today .calendar-weekday {
  color: #fabb18;
  font-weight: 600;
}

.calendar-number {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
  font-size: 20px;
  font-weight: 600;
  color: #000;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.calendar-number:hover {
  background: rgba(0, 0, 0, 0.05);
}

.calendar-column.is-today .calendar-number {
  color: #fabb18;
}

.calendar-number.is-other-month {
  opacity: 0.3;
}
</style>
