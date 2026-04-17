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
                  <n-icon><SearchIcon /></n-icon>
                </template>
              </n-input>
            </div>
            <n-badge :value="notifCount" :max="99" class="noti-badge">
              <n-button quaternary circle class="icon-btn">
                <template #icon><BellIcon /></template>
              </n-button>
            </n-badge>
            <n-button quaternary circle class="icon-btn" @click="$router.push('/settings')">
              <template #icon><SettingsIcon /></template>
            </n-button>
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
                  <n-button quaternary circle size="small">
                    <template #icon><ImageIcon /></template>
                  </n-button>
                  <n-button quaternary circle size="small">
                    <template #icon><LinkIcon /></template>
                  </n-button>
                  <n-button quaternary circle size="small">
                    <template #icon><NoteIcon /></template>
                  </n-button>
                </div>
                <n-button type="primary" class="submit-btn" @click="submitInput">
                  <template #icon><ArrowRightIcon /></template>
                  Inbox
                </n-button>
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
                      <n-button quaternary circle size="small" @click.stop="deleteCard(card.slug)">
                        <template #icon><TrashIcon /></template>
                      </n-button>
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
                <n-button circle size="small" type="primary">
                  <template #icon><PlusIcon /></template>
                </n-button>
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
  NButton,
  NIcon,
  NBadge,
  NSpace,
  NTag,
  NEmpty,
  NCheckbox,
  NMessageProvider,
  type GlobalThemeOverrides,
} from 'naive-ui'
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

const SearchIcon = h(NIcon, null, () => h(SearchOutline))
const BellIcon = h(NIcon, null, () => h(NotificationsOutline))
const SettingsIcon = h(NIcon, null, () => h(SettingsOutline))
const ImageIcon = h(NIcon, null, () => h(ImageOutline))
const LinkIcon = h(NIcon, null, () => h(LinkOutline))
const NoteIcon = h(NIcon, null, () => h(DocumentTextOutline))
const ArrowRightIcon = h(NIcon, null, () => h(ArrowForwardOutline))
const TrashIcon = h(NIcon, null, () => h(TrashOutline))
const PlusIcon = h(NIcon, null, () => h(AddOutline))

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#fabb18',
    primaryColorHover: '#f9c84a',
    primaryColorPressed: '#d9a015',
    borderRadius: '12px',
    fontFamily: 'Inter, PingFang SC, sans-serif',
  },
  Card: {
    color: '#ffffff',
    boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
  },
  Input: {
    color: 'rgba(239, 239, 239, 0.47)',
    colorFocus: 'rgba(239, 239, 239, 0.7)',
    borderRadius: '18px',
    boxShadowFocus: 'none',
  },
  Tag: {
    borderRadius: '100px',
    height: 'auto',
    padding: '7px',
  },
  Button: {
    borderRadiusMedium: '9999px',
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
  // TODO
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
  background: #f5f4ed;
  display: flex;
  overflow: hidden;
}

/* Left Content - 4/1 ratio */
.left-content {
  flex: 4;
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 31px 48px 48px;
  min-width: 0;
  overflow: hidden;
}

/* Navigation */
.nav {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 58px;
  margin-bottom: 32px;
}

.logo {
  font-family: 'Acme', sans-serif;
  font-size: 28px;
  font-weight: normal;
  color: #1a1a1a;
  white-space: nowrap;
}

.logo-x {
  color: #fabb18;
}

.nav-modes {
  display: flex;
  gap: 16px;
  white-space: nowrap;
}

.nav-mode-btn {
  font-family: 'Acme', sans-serif;
  font-size: 20px;
  color: #000000;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.2s;
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
  height: 44px;
}

.icon-btn {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
}

.noti-badge {
  flex-shrink: 0;
}

/* Input Section */
.input-section {
  margin-bottom: 32px;
}

.input-card {
  width: 100%;
  border-radius: 16px !important;
  box-shadow: 0px 4px 20px rgba(0, 0, 0, 0.03) !important;
  background: #faf9f6 !important;
  border: 1px solid rgba(26, 26, 26, 0.05) !important;
  padding: 0 !important;
  position: relative;
}

.input-card :deep(.n-card__content) {
  padding: 0 !important;
}

.input-card :deep(.n-card__action) {
  background: transparent !important;
  padding: 0 !important;
  margin: 0 !important;
}

.input-field :deep(.n-input-wrapper) {
  background: transparent !important;
  padding: 8px 12px 60px !important;
  cursor: text;
}

.input-field :deep(.n-input__textarea-el) {
  font-family: 'Newsreader', serif !important;
  font-style: italic;
  font-size: 20px !important;
  color: rgba(26, 26, 26, 0.8) !important;
  min-height: 96px !important;
}

.input-field :deep(.n-input__placeholder) {
  font-family: 'Newsreader', serif !important;
  font-style: italic;
  font-size: 20px !important;
  color: rgba(26, 26, 26, 0.3) !important;
  top: 8px !important;
  left: 12px !important;
}

.input-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
}

.attach-btns {
  display: flex;
  gap: 8px;
}

.submit-btn {
  background: #1a1a1a !important;
  color: #f4f1ea !important;
  border-radius: 9999px !important;
  padding: 8px 32px !important;
  font-family: 'Inter', sans-serif !important;
  font-size: 16px !important;
}

/* Article List */
.article-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.section-title {
  font-family: 'Acme', sans-serif;
  font-size: 28px;
  color: #000000;
  margin: 24px 0 16px;
}

/* Cards Grid */
.cards-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}

.card {
  width: 324px;
  border-radius: 12px !important;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  background: #ffffff;
  box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0px 8px 16px rgba(0, 0, 0, 0.25);
}

.card-image {
  width: 100%;
  height: 120px;
  background: #dedede;
}

.card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 120px;
}

.card-title {
  font-family: 'Source Code Pro', monospace;
  font-size: 14px;
  font-weight: 500;
  color: #000000;
  margin: 0;
}

.card-preview {
  font-family: 'Source Code Pro', monospace;
  font-size: 12px;
  color: #666666;
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
  font-family: 'Source Code Pro', monospace;
  font-size: 10px;
  cursor: pointer;
  text-transform: capitalize;
}

/* Right Content - 400px width, full height */
.right-content {
  flex: 0 0 400px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 42px;
  padding: 37px 30px 25px 29px;
  background: #f9f9f9;
  border-radius: 38px 0 0 38px;
}

.sidebar-card {
  border-radius: 34px !important;
  box-shadow: 0px 16px 31px rgba(0, 0, 0, 0.01) !important;
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
  padding: 0 10px;
}

/* FullCalendar Customization */
.calendar-wrapper :deep(.fc) {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
}

.calendar-wrapper :deep(.fc-timegrid) {
  height: 350px;
}

.calendar-wrapper :deep(.fc-col-header) {
  background: transparent;
}

.calendar-wrapper :deep(.fc-col-header-cell) {
  padding: 8px 0;
}

.calendar-wrapper :deep(.fc-col-header-cell-cushion) {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
  font-size: 18px;
  font-weight: normal;
  color: #000;
  text-transform: uppercase;
}

.calendar-wrapper :deep(.fc-timegrid-slot) {
  height: 32px;
}

.calendar-wrapper :deep(.fc-timegrid-slot-label) {
  font-size: 12px;
  color: #666;
}

.calendar-wrapper :deep(.fc-timegrid-slot-label-cushion) {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
}

.calendar-wrapper :deep(.fc-timegrid-event) {
  display: none;
}

.calendar-wrapper :deep(.fc-timegrid-col) {
  cursor: pointer;
}

.calendar-wrapper :deep(.fc-timegrid-col:hover) {
  background: rgba(0, 0, 0, 0.02);
}

.calendar-wrapper :deep(.fc-day-today) {
  background: rgba(250, 187, 24, 0.1) !important;
}

.calendar-wrapper :deep(.fc-day-today .fc-col-header-cell-cushion) {
  color: #fabb18 !important;
  font-weight: 600;
}

.cal-header {
  padding: 0 10px;
}

.cal-date {
  font-family: 'SF Pro Text', sans-serif;
  font-size: 30px;
  color: #000000;
  opacity: 0.7;
  cursor: pointer;
}

.cal-date:hover {
  opacity: 1;
}

.clear-hint {
  font-size: 24px;
  margin-left: 8px;
  opacity: 0.5;
}

.clear-hint:hover {
  opacity: 1;
}

.cal-today-btn {
  font-family: 'SF Pro Text', sans-serif !important;
  font-size: 48px !important;
  font-weight: 700 !important;
  color: #000000 !important;
  margin-top: 10px;
}

.notes-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
}

.notes-title {
  font-family: 'Comic Sans MS', cursive;
  font-size: 28px;
  color: #000000;
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.note-item {
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #fabb18;
  border-radius: 12px;
  background: #ffffff;
  padding: 15px;
  height: 56px;
}

.note-text {
  font-family: 'Inter', sans-serif;
  font-size: 17px;
  font-weight: 500;
  color: #121212;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-state {
  padding: 32px 0;
}
</style>
