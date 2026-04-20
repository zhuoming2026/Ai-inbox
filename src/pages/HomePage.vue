<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <div class="home-page">
      <div class="left-content">
        <nav class="nav">
          <h1 class="logo">Inbox</h1>
          <div class="search-box">
            <n-input
              v-model:value="searchQuery"
              placeholder="Search Inbox ..."
              clearable
              class="search-input"
            >
              <template #prefix>
                <SearchIcon />
              </template>
            </n-input>
          </div>
          <PillButton
            :icon="SettingsOutline"
            bg-color="var(--color-primary)"
            icon-only
            @click="$router.push('/settings')"
          />
        </nav>

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
                <PillButton :icon="Image" bg-color="var(--color-primary)" icon-only />
                <PillButton :icon="Link" bg-color="var(--color-primary)" icon-only />
                <PillButton :icon="Document" bg-color="var(--color-primary)" icon-only />
              </div>
              <PillButton
                text="Inbox"
                :icon="ArrowForwardOutline"
                bg-color="var(--color-primary)"
                @click="submitInput"
              />
            </div>
          </n-card>
        </div>

        <div ref="articleListRef" class="article-list">
          <div class="article-header">
            <div class="article-filters">
              <button
                v-for="option in bucketFilters"
                :key="option.value"
                type="button"
                class="filter-button"
                :class="{ active: activeBucket === option.value }"
                @click="setActiveBucket(option.value)"
              >{{ option.label }}</button>
            </div>
          </div>

          <template v-for="(group, dateLabel) in groupedCards" :key="dateLabel">
            <div class="group-header">
              <h2 class="section-title">{{ dateLabel }}</h2>
            </div>
            <div class="cards-grid">
              <div
                v-for="card in group"
                :key="card.slug"
                class="card"
                :class="{ collected: card.bucket === 'collected' }"
                @click="openArticle(card.slug)"
              >
                <div v-if="card.bucket === 'collected'" class="collect-mark">♛</div>
                <div v-if="card.type === 'image'" class="card-image"></div>
                <div class="card-body">
                  <h3 class="card-title">{{ card.title }}</h3>
                  <div v-if="card.tags.length" class="card-tags">
                    <n-tag
                      v-for="tag in card.tags.slice(0, 3)"
                      :key="tag"
                      size="small"
                      :bordered="false"
                      class="ai-tag"
                    >{{ tag }}</n-tag>
                  </div>
                  <p class="card-preview">{{ card.preview }}</p>
                  <div class="card-footer">
                    <n-tag
                      :type="getEnrichTagType(card.enrichStatus)"
                      :bordered="false"
                      :strong="true"
                      class="status-tag enrich-tag"
                      @click.stop="handleEnrichClick(card)"
                    >{{ getEnrichLabel(card.enrichStatus) }}</n-tag>
                    <div class="card-actions">
                      <button
                        class="icon-action"
                        :class="{ active: card.bucket === 'collected' }"
                        @click.stop="toggleCollect(card)"
                      >
                        <n-icon><component :is="card.bucket === 'collected' ? Star : StarOutline" /></n-icon>
                      </button>
                      <button class="icon-action danger" @click.stop="deleteCard(card.slug)">
                        <n-icon><TrashOutline /></n-icon>
                      </button>
                    </div>
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

      <aside class="right-content">
        <n-card class="sidebar-card calendar-card" :bordered="false">
          <template #header>
            <div class="sidebar-header">
              <h3 class="sidebar-title">Calendar</h3>
            </div>
          </template>
          <MonthCalendar
            :selected-date="selectedDateTs"
            :marked-dates="markedDates"
            @select="onDateSelect"
            @month-change="onMonthChange"
          />
        </n-card>

        <n-card class="sidebar-card scratchpad-card" :bordered="false">
          <template #header>
            <div class="sidebar-header">
              <h3 class="sidebar-title">Scratchpad</h3>
              <div class="scratchpad-modes">
                <n-tag
                  :type="scratchpadMode === 'edit' ? 'warning' : 'default'"
                  :bordered="false"
                  @click="scratchpadMode = 'edit'"
                >Edit</n-tag>
                <n-tag
                  :type="scratchpadMode === 'preview' ? 'warning' : 'default'"
                  :bordered="false"
                  @click="scratchpadMode = 'preview'"
                >Preview</n-tag>
              </div>
            </div>
          </template>

          <div v-if="scratchpadMode === 'edit'" class="scratchpad-edit">
            <textarea
              v-model="scratchpadContent"
              class="scratchpad-textarea"
              placeholder="临时笔记，随便写点什么吧"
            ></textarea>
          </div>
          <div v-else class="scratchpad-preview">
            <p v-if="!scratchpadContent" class="scratchpad-placeholder">临时笔记，随便写点什么吧</p>
            <div v-else class="scratchpad-rendered" v-html="scratchpadPreview"></div>
          </div>
        </n-card>
      </aside>
    </div>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, h, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { marked } from 'marked'
import { useInboxStore, type InboxCard } from '@/stores/inbox'
import {
  NCard,
  NConfigProvider,
  NEmpty,
  NIcon,
  NInput,
  NTag,
  useMessage,
  type GlobalThemeOverrides,
} from 'naive-ui'
import PillButton from '../components/PillButton.vue'
import MonthCalendar from '../components/MonthCalendar.vue'
import {
  ArrowForwardOutline,
  Document,
  Image,
  Link,
  SearchOutline,
  SettingsOutline,
  Star,
  StarOutline,
  TrashOutline,
} from '@vicons/ionicons5'

const router = useRouter()
const inboxStore = useInboxStore()
const message = useMessage()

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
  },
}

const searchQuery = ref('')
const selectedDateTs = ref<number | undefined>(undefined)
const dateFilterActive = ref(false)
const inputText = ref('')
const activeBucket = ref<'inbox' | 'collected' | 'all'>('all')
const scratchpadMode = ref<'edit' | 'preview'>('edit')
const scratchpadContent = ref('')
const articleListRef = ref<HTMLElement | null>(null)
let scratchpadSaveTimer: ReturnType<typeof setTimeout> | null = null

const bucketFilters = [
  { label: 'Inbox', value: 'inbox' as const },
  { label: 'Collected', value: 'collected' as const },
  { label: 'All', value: 'all' as const },
]

const today = new Date()
const todayStr = today.toISOString().split('T')[0]
const yesterday = new Date(today)
yesterday.setDate(yesterday.getDate() - 1)
const yesterdayStr = yesterday.toISOString().split('T')[0]

const markedDates = computed(() => Array.from(new Set(inboxStore.cards.map((card) => card.created))))

const scratchpadPreview = computed(() => marked.parse(scratchpadContent.value || ''))

const filteredCards = computed(() => {
  let cards = inboxStore.cards
  if (activeBucket.value !== 'all') {
    cards = cards.filter((card) => card.bucket === activeBucket.value)
  }
  if (dateFilterActive.value && selectedDateTs.value) {
    const selected = new Date(selectedDateTs.value).toISOString().split('T')[0]
    cards = cards.filter((card) => card.created === selected)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    cards = cards.filter((card) =>
      card.title.toLowerCase().includes(q) ||
      card.preview.toLowerCase().includes(q) ||
      card.tags.some((tag) => tag.toLowerCase().includes(q))
    )
  }
  return cards
})

const groupedCards = computed(() => {
  const groups: Record<string, typeof filteredCards.value> = {}
  for (const card of filteredCards.value) {
    const dateLabel =
      card.created === todayStr ? '今天' :
      card.created === yesterdayStr ? '昨天' :
      formatDateShort(card.created)
    if (!groups[dateLabel]) groups[dateLabel] = []
    groups[dateLabel].push(card)
  }
  return groups
})

function onDateSelect(ts: number) {
  selectedDateTs.value = ts
  dateFilterActive.value = true
}

function onMonthChange(_monthStart: number) {}

function clearDateSelection() {
  selectedDateTs.value = undefined
  dateFilterActive.value = false
}

function setActiveBucket(bucket: 'inbox' | 'collected' | 'all') {
  activeBucket.value = bucket
}

function formatDateShort(dateStr: string) {
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[1]}-${parts[2]}`
  }
  return dateStr
}

function getEnrichTagType(status: string): 'success' | 'info' | 'warning' | 'default' {
  const map: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
    none: 'default',
    fetching: 'info',
    success: 'success',
    failed: 'warning',
  }
  return map[status] || 'default'
}

function getEnrichLabel(status: string) {
  const map: Record<string, string> = {
    none: 'Raw',
    fetching: 'Fetching',
    success: 'Success',
    failed: 'Failed',
  }
  return map[status] || 'Raw'
}

function openArticle(slug: string) {
  router.push(`/article/${slug}`)
}

async function submitInput() {
  if (!inputText.value.trim()) return
  const content = inputText.value.trim()
  let type = 'note'
  if (content.startsWith('todo ')) type = 'todo'
  else if (content.startsWith('研究 ')) type = 'research'
  else if (content.startsWith('记录 ')) type = 'note'
  else if (content.startsWith('http')) type = 'link'

  try {
    await window.electronAPI?.processInput(type, content)
    inputText.value = ''
    await inboxStore.loadCards()
    message.success('已提交到 inbox')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '处理输入失败')
  }
}

async function handleEnrichClick(card: InboxCard) {
  if (card.enrichStatus === 'fetching' || card.enrichStatus === 'success') return
  try {
    await inboxStore.enrichCard(card.slug)
    message.success('已触发 AI enrich')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '触发 enrich 失败')
  }
}

async function toggleCollect(card: InboxCard) {
  try {
    await inboxStore.toggleCollected(card.slug, card.bucket !== 'collected')
    message.success(card.bucket === 'collected' ? '已取消 Collect' : '已加入 Collect')
  } catch (error) {
    message.error(error instanceof Error ? error.message : 'Collect 操作失败')
  }
}

async function deleteCard(slug: string) {
  try {
    await inboxStore.deleteCard(slug)
    message.success('已删除')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '删除失败')
  }
}

onMounted(() => {
  inboxStore.loadCards()
  window.electronAPI?.readScratchpad().then((content) => {
    scratchpadContent.value = content || ''
  })
  window.addEventListener('inbox-updated', handleInboxUpdated)
})

onBeforeUnmount(() => {
  if (scratchpadSaveTimer) {
    clearTimeout(scratchpadSaveTimer)
    scratchpadSaveTimer = null
    window.electronAPI?.writeScratchpad(scratchpadContent.value).catch(() => undefined)
  }
  window.removeEventListener('inbox-updated', handleInboxUpdated)
})

function handleInboxUpdated() {
  inboxStore.loadCards()
}

function scrollArticleListToTop() {
  nextTick(() => {
    articleListRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
  })
}

watch(activeBucket, () => {
  clearDateSelection()
  scrollArticleListToTop()
})

watch(scratchpadContent, (value) => {
  if (scratchpadSaveTimer) clearTimeout(scratchpadSaveTimer)
  scratchpadSaveTimer = setTimeout(() => {
    window.electronAPI?.writeScratchpad(value).catch(() => undefined)
  }, 200)
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
  color: var(--text-primary);
  margin: 0;
  white-space: nowrap;
}

.search-box {
  flex: 1;
  min-width: 0;
}

.search-input {
  width: 100%;
  height: var(--input-height);
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
}

.input-card :deep(.n-card__content) {
  padding: 0;
}

.input-field :deep(.n-input-wrapper) {
  background: transparent;
  padding: var(--space-2) var(--space-3);
}

.input-field :deep(.n-input__textarea-el) {
  font-family: var(--font-body);
  font-size: var(--text-xl);
  color: var(--text-primary);
  min-height: 96px;
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
  position: relative;
}

.article-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: var(--space-4);
  position: sticky;
  top: 0;
  z-index: 5;
  padding-bottom: var(--space-2);
  background: linear-gradient(180deg, var(--bg-primary) 74%, rgba(245, 243, 237, 0));
}

.article-filters {
  display: flex;
  gap: var(--space-3);
}

.filter-button {
  border: none;
  background: transparent;
  padding: 0;
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--text-secondary);
  cursor: pointer;
  transition: color var(--transition-base), opacity var(--transition-base);
}

.filter-button:hover {
  color: var(--text-primary);
}

.filter-button.active {
  color: var(--color-primary);
}

.section-title {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  color: var(--text-primary);
  margin: var(--space-6) 0 var(--space-4);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-5);
}

.card {
  position: relative;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  cursor: pointer;
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.card:hover {
  transform: translateY(-2px);
}

.card.collected {
  background: linear-gradient(180deg, rgba(250, 187, 24, 0.12), rgba(255, 255, 255, 0.96));
  border-color: rgba(250, 187, 24, 0.35);
}

.collect-mark {
  position: absolute;
  top: 12px;
  right: 14px;
  font-size: 18px;
  opacity: 0.35;
}

.card-image {
  height: 140px;
  background: linear-gradient(135deg, rgba(250, 187, 24, 0.18), rgba(250, 187, 24, 0.04));
}

.card-body {
  padding: var(--space-4);
}

.card-title {
  margin: 0 0 var(--space-3);
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  overflow: hidden;
}

.ai-tag {
  flex-shrink: 0;
}

.card-preview {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--space-4);
}

.enrich-tag {
  cursor: pointer;
}

.card-actions {
  display: flex;
  gap: var(--space-2);
}

.icon-action {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.icon-action.active {
  color: var(--color-primary);
  border-color: rgba(250, 187, 24, 0.5);
  background: rgba(250, 187, 24, 0.12);
}

.icon-action.danger {
  opacity: 0.7;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 220px;
}

.right-content {
  width: 380px;
  flex-shrink: 0;
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.sidebar-card {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sidebar);
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: baseline;
  justify-content: flex-start;
}

.sidebar-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--text-primary);
}

.scratchpad-card {
  flex: 1;
}

.scratchpad-modes {
  display: flex;
  gap: var(--space-2);
}

.scratchpad-edit,
.scratchpad-preview {
  min-height: 240px;
}

.scratchpad-textarea {
  width: 100%;
  min-height: 240px;
  resize: none;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-editor);
  line-height: 1.7;
}

.scratchpad-placeholder {
  color: var(--text-placeholder);
  margin: 0;
}

.scratchpad-rendered {
  color: var(--text-primary);
  font-family: var(--font-editor);
  line-height: 1.7;
}

.scratchpad-rendered :deep(h1),
.scratchpad-rendered :deep(h2),
.scratchpad-rendered :deep(h3) {
  margin-top: 0;
  font-family: var(--font-display);
}

.scratchpad-rendered :deep(p) {
  margin: 0 0 var(--space-3);
}

.scratchpad-rendered :deep(pre) {
  white-space: pre-wrap;
  background: rgba(0, 0, 0, 0.03);
  padding: var(--space-3);
  border-radius: var(--radius-md);
}
</style>
