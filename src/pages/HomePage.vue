<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-message-provider>
      <div class="home-page">
        <!-- Left Content -->
        <div class="left-content">
          <!-- Navigation -->
          <nav class="nav">
            <h1 class="logo">Ai-In<span class="logo-x">box</span></h1>
            <div class="nav-modes">
              <span class="nav-mode-btn" :class="{ active: mode === 'write' }" @click="mode = 'write'">Write</span>
              <span class="nav-mode-btn" :class="{ active: mode === 'read' }" @click="mode = 'read'">Read</span>
            </div>
            <div class="search-box">
              <n-input
                v-model:value="searchQuery"
                placeholder="Search Project ..."
                clearable
                class="search-input"
              >
                <template #prefix>
                  <SearchIcon />
                </template>
              </n-input>
            </div>
            <n-badge :value="notifCount" :max="99" class="noti-badge">
              <PillButton
                :icon="NotificationsOutline"
                bg-color="var(--color-primary)"
                text-color="#fff"
                size="small"
              />
            </n-badge>
            <PillButton
              :icon="SettingsOutline"
              bg-color="var(--color-primary)"
              text-color="#fff"
              size="small"
              @click="$router.push('/settings')"
            />
          </nav>

          <!-- Input Area -->
          <div class="input-section">
            <n-card class="input-card" :bordered="false">
              <n-input
                v-model:value="inputText"
                type="textarea"
                placeholder="Capture a thought, link, or task..."
                :bordered="false"
                class="input-field"
                @keydown.enter.exact.prevent="submitInput"
              />
              <div class="input-actions">
                <div class="attach-btns">
                  <PillButton
                    :icon="ImageOutline"
                    bg-color="var(--color-primary)"
                    text-color="#fff"
                    size="small"
                  />
                  <PillButton
                    :icon="LinkOutline"
                    bg-color="var(--color-primary)"
                    text-color="#fff"
                    size="small"
                  />
                  <PillButton
                    :icon="DocumentTextOutline"
                    bg-color="var(--color-primary)"
                    text-color="#fff"
                    size="small"
                  />
                </div>
                <PillButton
                  text="Inbox"
                  :icon="ArrowForwardOutline"
                  bg-color="var(--color-primary)"
                  text-color="#fff"
                  size="small"
                  @click="submitInput"
                />
              </div>
            </n-card>
          </div>

          <!-- Article List -->
          <div class="article-list">
            <template v-for="(group, dateLabel) in groupedCards" :key="dateLabel">
              <h2 class="section-title">{{ dateLabel }}</h2>
              <div class="cards-grid">
                <div
                  v-for="card in group"
                  :key="card.slug"
                  class="card"
                  @click="openArticle(card.slug)"
                >
                  <div v-if="card.type === 'image'" class="card-image"></div>
                  <div class="card-body">
                    <h3 class="card-title">{{ card.title }}</h3>
                    <p class="card-preview">{{ card.preview }}</p>
                    <div class="card-footer">
                      <n-space>
                        <n-tag
                          v-for="s in statuses"
                          :key="s"
                          :type="getStatusType(s)"
                          :bordered="false"
                          :strong="true"
                          :class="['status-tag', { active: card.status === s }]"
                          @click.stop="toggleStatus(card, s)"
                        >{{ s }}</n-tag>
                      </n-space>
                      <PillButton
                        :icon="TrashOutline"
                        bg-color="var(--color-primary)"
                        text-color="#fff"
                        size="small"
                        @click.stop="deleteCard(card.slug)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <div v-if="Object.keys(groupedCards).length === 0" class="empty-state">
              <n-empty description="No content yet" />
            </div>
          </div>
        </div>

        <!-- Right Content -->
        <aside class="right-content">
          <!-- Calendar -->
          <n-card class="sidebar-card calendar-card" :bordered="false">
            <WeekCalendar
              :selected-date="selectedDateTs"
              @select="onDateSelect"
              @clear="clearDateSelection"
            />
          </n-card>

          <!-- Notes -->
          <n-card class="sidebar-card notes-card" :bordered="false">
            <template #header>
              <div class="notes-header">
                <h3 class="notes-title">Notes</h3>
                <PillButton
                  :icon="AddOutline"
                  bg-color="var(--color-primary)"
                  text-color="#fff"
                  size="small"
                />
              </div>
            </template>
            <div class="notes-list">
              <div v-for="note in notes" :key="note.id" class="note-item">
                <n-checkbox />
                <span class="note-text">{{ note.text }}</span>
              </div>
            </div>
          </n-card>
        </aside>
      </div>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { useRouter } from 'vue-router'
import { useInboxStore } from '@/stores/inbox'
import {
  NConfigProvider,
  NCard,
  NInput,
  NIcon,
  NBadge,
  NSpace,
  NTag,
  NEmpty,
  NCheckbox,
  NMessageProvider,
  type GlobalThemeOverrides,
} from 'naive-ui'
import PillButton from '@/components/PillButton.vue'
import WeekCalendar from '@/components/WeekCalendar.vue'
import {
  SearchOutline,
  NotificationsOutline,
  SettingsOutline,
  ImageOutline,
  LinkOutline,
  DocumentTextOutline,
  ArrowForwardOutline,
  TrashOutline,
  AddOutline,
} from '@vicons/ionicons5'

const router = useRouter()
const inboxStore = useInboxStore()

const SearchIcon = () => h(NIcon, null, () => h(SearchOutline))

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#fabb18',
    primaryColorHover: '#f9c84a',
    primaryColorPressed: '#d9a015',
    borderRadius: '12px',
    fontFamily: 'Source Sans 3, Nunito Sans, system-ui, sans-serif',
  },
  Card: {
    color: '#ffffff',
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.03)',
  },
  Input: {
    color: 'rgba(239, 239, 239, 0.47)',
    colorFocus: 'rgba(239, 239, 239, 0.7)',
    borderRadius: '12px',
    boxShadowFocus: 'none',
  },
  Tag: {
    borderRadius: '9999px',
    height: 'auto',
    padding: '7px',
  },
  Button: {
    borderRadiusMedium: '9999px',
    borderRadiusSmall: '9999px',
    borderRadiusTiny: '9999px',
    color: '#fabb18',
    colorHover: '#fabb18',
    colorPressed: '#fabb18',
    colorFocus: '#fabb18',
    colorDisabled: '#fabb18',
    colorPrimary: '#fabb18',
    colorHoverPrimary: '#fabb18',
    colorPressedPrimary: '#fabb18',
    colorFocusPrimary: '#fabb18',
    colorDisabledPrimary: '#fabb18',
    textColor: '#FFF',
    textColorHover: '#FFF',
    textColorPressed: '#FFF',
    textColorFocus: '#FFF',
    textColorDisabled: '#FFF',
    textColorPrimary: '#FFF',
    textColorHoverPrimary: '#FFF',
    textColorPressedPrimary: '#FFF',
    textColorFocusPrimary: '#FFF',
    textColorDisabledPrimary: '#FFF',
    border: '1px solid #fabb18',
    borderHover: '1px solid #fabb18',
    borderPressed: '1px solid #fabb18',
    borderFocus: '1px solid #fabb18',
    borderDisabled: '1px solid #fabb18',
    borderPrimary: '1px solid #fabb18',
    borderHoverPrimary: '1px solid #fabb18',
    borderPressedPrimary: '1px solid #fabb18',
    borderFocusPrimary: '1px solid #fabb18',
    borderDisabledPrimary: '1px solid #fabb18',
    iconColor: '#FFF',
    iconColorHover: '#FFF',
    iconColorPressed: '#FFF',
    iconColorFocus: '#FFF',
    iconColorDisabled: '#FFF',
  },
}

const mode = ref<'write' | 'read'>('write')
const searchQuery = ref('')
const selectedDateTs = ref<number | undefined>(undefined)
const dateFilterActive = ref(false)
const inputText = ref('')
const notifCount = ref(12)

const statuses = ['ready', 'working', 'finished']

const notes = ref([
  { id: 1, text: 'Drink 8 glasses of water', done: false },
  { id: 2, text: 'Meditate for 10 minutes', done: false },
  { id: 3, text: 'Read a chapter of a book', done: false },
  { id: 4, text: 'Go for a 30-minute walk', done: false },
  { id: 5, text: 'Write in a gratitude journal', done: false },
  { id: 6, text: 'Plan meals for the day', done: false },
])

const today = new Date()
const todayStr = today.toISOString().split('T')[0]
const yesterday = new Date(today)
yesterday.setDate(yesterday.getDate() - 1)
const yesterdayStr = yesterday.toISOString().split('T')[0]

const filteredCards = computed(() => {
  let cards = inboxStore.cards
  if (dateFilterActive.value && selectedDateTs.value) {
    const selected = new Date(selectedDateTs.value).toISOString().split('T')[0]
    cards = cards.filter(c => c.created === selected)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    cards = cards.filter(c =>
      c.title.toLowerCase().includes(q) ||
      (c.raw && c.raw.toLowerCase().includes(q))
    )
  }
  return cards
})

const groupedCards = computed(() => {
  const groups: Record<string, typeof filteredCards.value> = {}
  for (const card of filteredCards.value) {
    const dateLabel = card.created === todayStr ? '今天' : card.created === yesterdayStr ? '昨天' : formatDateShort(card.created)
    if (!groups[dateLabel]) groups[dateLabel] = []
    groups[dateLabel].push(card)
  }
  return groups
})

function getStatusType(status: string): 'success' | 'info' | 'warning' | 'default' {
  const map: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
    ready: 'success',
    working: 'info',
    finished: 'default',
  }
  return map[status] || 'default'
}

function onDateSelect(ts: number) {
  selectedDateTs.value = ts
  dateFilterActive.value = true
}

function clearDateSelection() {
  selectedDateTs.value = undefined
  dateFilterActive.value = false
}

function formatDateShort(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[1]}-${parts[2]}`
  }
  return dateStr
}

function toggleStatus(_card: any, _status: string) {
}

function openArticle(slug: string) {
  router.push(`/article/${slug}`)
}

function submitInput() {
  if (!inputText.value.trim()) return
  const content = inputText.value.trim()
  let type = 'note'
  if (content.startsWith('todo ')) type = 'todo'
  else if (content.startsWith('研究 ')) type = 'research'
  else if (content.startsWith('记录 ')) type = 'note'
  else if (content.startsWith('http')) type = 'link'

  window.electronAPI?.processInput(type, content)
  inputText.value = ''
  inboxStore.loadCards()
}

function deleteCard(slug: string) {
  window.electronAPI?.deleteFile(slug)
  inboxStore.loadCards()
}

onMounted(() => {
  inboxStore.loadCards()
  window.addEventListener('inbox-updated', () => inboxStore.loadCards())
})
</script>

<style scoped>
.home-page {
  width: 100%;
  height: 100vh;
  background: var(--bg-primary);
  display: flex;
  overflow: hidden;
}

.left-content {
  flex: 4;
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: var(--space-6);
  min-width: 0;
  overflow: hidden;
}

.nav {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  height: var(--nav-height);
  margin-bottom: var(--space-8);
}

.logo {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: normal;
  color: var(--text-primary);
  white-space: nowrap;
}

.logo-x {
  color: var(--color-primary);
}

.nav-modes {
  display: flex;
  gap: var(--space-4);
  white-space: nowrap;
}

.nav-mode-btn {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--text-primary);
  cursor: pointer;
  opacity: 0.5;
  transition: opacity var(--transition-base);
}

.nav-mode-btn.active,
.nav-mode-btn:hover {
  opacity: 1;
}

.search-box {
  flex: 1;
  min-width: 0;
}

.search-input {
  width: 100%;
  height: var(--input-height);
}

.noti-badge {
  flex-shrink: 0;
}

.input-section {
  margin-bottom: var(--space-8);
}

.input-card {
  width: 100%;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 0;
  position: relative;
}

.input-card :deep(.n-card__content) {
  padding: 0;
}

.input-card :deep(.n-card__action) {
  background: transparent;
  padding: 0;
  margin: 0;
}

.input-field :deep(.n-input-wrapper) {
  background: transparent;
  padding: var(--space-2) var(--space-3);
  cursor: text;
}

.input-field :deep(.n-input__textarea-el) {
  font-family: var(--font-body);
  font-size: var(--text-xl);
  color: var(--text-primary);
  min-height: 96px;
}

.input-field :deep(.n-input__placeholder) {
  font-family: var(--font-body);
  font-size: var(--text-xl);
  color: var(--text-placeholder);
  top: var(--space-2);
  left: var(--space-3);
}

.input-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--space-4);
}

.attach-btns {
  display: flex;
  gap: var(--space-2);
}

.article-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.section-title {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  color: var(--text-primary);
  margin: var(--space-6) 0 var(--space-4);
}

.cards-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
}

.card {
  width: 324px;
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  transition: transform var(--transition-base), box-shadow var(--transition-base);
  background: var(--bg-card);
  box-shadow: var(--shadow-card);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-card-hover);
}

.card-image {
  width: 100%;
  height: 120px;
  background: var(--border-color-light);
}

.card-body {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-height: 120px;
}

.card-title {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
  margin: 0;
}

.card-preview {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}

.status-tag {
  font-family: var(--font-mono);
  font-size: 10px;
  cursor: pointer;
  text-transform: capitalize;
}

.right-content {
  flex: 0 0 var(--sidebar-width);
  height: 100vh;
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  padding: 37px var(--space-8) var(--space-6) 29px;
  background: var(--bg-sidebar);
  border-radius: 38px 0 0 38px;
}

.sidebar-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sidebar);
}

.calendar-card {
  overflow: visible;
  flex: 0 0 auto;
}

.notes-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.notes-card :deep(.n-card__content) {
  flex: 1;
  overflow: auto;
}

.calendar-wrapper {
  padding: 0 var(--space-3);
}

.calendar-wrapper :deep(.fc) {
  font-family: var(--font-body);
}

.calendar-wrapper :deep(.fc-timegrid) {
  height: 350px;
}

.calendar-wrapper :deep(.fc-col-header) {
  background: transparent;
}

.calendar-wrapper :deep(.fc-col-header-cell) {
  padding: var(--space-2) 0;
}

.calendar-wrapper :deep(.fc-col-header-cell-cushion) {
  font-family: var(--font-body);
  font-size: var(--text-lg);
  font-weight: normal;
  color: var(--text-primary);
  text-transform: uppercase;
}

.calendar-wrapper :deep(.fc-timegrid-slot) {
  height: 32px;
}

.calendar-wrapper :deep(.fc-timegrid-slot-label) {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.calendar-wrapper :deep(.fc-timegrid-slot-label-cushion) {
  font-family: var(--font-body);
}

.calendar-wrapper :deep(.fc-timegrid-event) {
  display: none;
}

.calendar-wrapper :deep(.fc-timegrid-col) {
  cursor: pointer;
}

.calendar-wrapper :deep(.fc-timegrid-col:hover) {
  background: var(--border-color);
}

.calendar-wrapper :deep(.fc-day-today) {
  background: var(--color-warning-bg);
}

.calendar-wrapper :deep(.fc-day-today .fc-col-header-cell-cushion) {
  color: var(--color-primary);
  font-weight: 600;
}

.cal-header {
  padding: 0 var(--space-3);
}

.cal-date {
  font-family: var(--font-body);
  font-size: var(--text-3xl);
  color: var(--text-primary);
  opacity: 0.7;
  cursor: pointer;
}

.cal-date:hover {
  opacity: 1;
}

.clear-hint {
  font-size: var(--text-2xl);
  margin-left: var(--space-2);
  opacity: 0.5;
}

.clear-hint:hover {
  opacity: 1;
}

.cal-today-btn {
  font-family: var(--font-body);
  font-size: var(--text-4xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-top: var(--space-3);
}

.notes-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-3);
}

.notes-title {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  color: var(--text-primary);
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.note-item {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  background: var(--bg-card);
  padding: var(--space-4);
  height: 56px;
}

.note-text {
  font-family: var(--font-body);
  font-size: var(--text-lg);
  font-weight: 500;
  color: var(--text-primary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-state {
  padding: var(--space-8) 0;
}
</style>
