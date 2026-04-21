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
            <div class="article-filter-state">
              <div v-if="dateFilterActive" class="filter-chip">
                <span class="filter-chip-label">日期</span>
                <span>{{ selectedDateLabel }}</span>
                <button type="button" class="clear-filter-btn" @click="clearDateSelection">清除</button>
              </div>
              <div v-if="searchQuery.trim()" class="filter-chip subtle">
                <span class="filter-chip-label">搜索</span>
                <span class="filter-chip-value">{{ searchQuery.trim() }}</span>
                <button type="button" class="clear-filter-btn" @click="clearSearch">清除</button>
              </div>
            </div>

            <div class="article-filters" role="tablist" aria-label="Bucket filters">
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
                :class="{
                  collected: card.bucket === 'collected',
                  deleted: card.bucket === 'deleted',
                }"
                @click="openArticle(card.slug)"
              >
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
                    <div class="card-actions-wrap">
                      <span class="card-date">{{ formatDateShort(card.created) }}</span>
                      <div class="card-actions">
                        <button
                          v-if="card.bucket === 'deleted'"
                          class="icon-action"
                          @click.stop="restoreCard(card.slug)"
                        >
                          <n-icon><ArrowUndoOutline /></n-icon>
                        </button>
                        <button
                          v-else
                          class="icon-action"
                          :class="{ active: card.bucket === 'collected' }"
                          @click.stop="toggleCollect(card)"
                        >
                          <n-icon><component :is="card.bucket === 'collected' ? Star : StarOutline" /></n-icon>
                        </button>
                        <button v-if="card.bucket !== 'deleted'" class="icon-action danger" @click.stop="deleteCard(card.slug)">
                          <n-icon><TrashOutline /></n-icon>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <div v-if="Object.keys(groupedCards).length === 0" class="empty-state">
            <n-empty :description="emptyStateDescription">
              <template #extra>
                <p class="empty-hint">{{ emptyStateHint }}</p>
              </template>
            </n-empty>
          </div>
        </div>
      </div>

      <aside class="right-content">
        <n-card class="sidebar-card calendar-card" :bordered="false">
          <template #header>
            <div class="sidebar-header">
              <h3 class="sidebar-title">Calendar</h3>
              <div class="sidebar-meta">
                <span class="sidebar-month">{{ visibleMonthLabel }}</span>
              </div>
            </div>
          </template>
          <MonthCalendar
            :selected-date="selectedDateTs"
            :marked-dates="markedDates"
            :hide-month-label="true"
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

          <div class="scratchpad-body">
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
import type { DocumentBucket } from '@/shared/inbox-document'
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
  ArrowUndoOutline,
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
const activeBucket = ref<DocumentBucket | 'all'>('all')
const scratchpadMode = ref<'edit' | 'preview'>('edit')
const scratchpadContent = ref('')
const articleListRef = ref<HTMLElement | null>(null)
const visibleMonthTs = ref(new Date().setDate(1))
let scratchpadSaveTimer: ReturnType<typeof setTimeout> | null = null

const bucketFilters = [
  { label: 'Inbox', value: 'inbox' as const },
  { label: 'Collected', value: 'collected' as const },
  { label: 'Deleted', value: 'deleted' as const },
  { label: 'All', value: 'all' as const },
]

const today = new Date()
const todayStr = today.toISOString().split('T')[0]
const yesterday = new Date(today)
yesterday.setDate(yesterday.getDate() - 1)
const yesterdayStr = yesterday.toISOString().split('T')[0]

const markedDates = computed(() => Array.from(new Set(inboxStore.cards.map((card) => card.created))))
const scratchpadPreview = computed(() => marked.parse(scratchpadContent.value || ''))
const visibleMonthLabel = computed(() => {
  const date = new Date(visibleMonthTs.value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
})

const selectedDateLabel = computed(() => {
  if (!dateFilterActive.value || !selectedDateTs.value) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(selectedDateTs.value))
})

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

const emptyStateDescription = computed(() => {
  if (searchQuery.value.trim()) {
    return `没有找到和“${searchQuery.value.trim()}”相关的内容`
  }
  if (dateFilterActive.value) {
    return '这一天还没有符合筛选条件的内容'
  }
  if (activeBucket.value === 'inbox') {
    return 'Inbox 还是空的'
  }
  if (activeBucket.value === 'collected') {
    return 'Collected 里还没有内容'
  }
  if (activeBucket.value === 'deleted') {
    return 'Deleted 里还是空的'
  }
  return '还没有内容'
})

const emptyStateHint = computed(() => {
  if (searchQuery.value.trim()) {
    return '换个关键词，或者清空搜索试试，也可以直接回到 All 看看最近的内容。'
  }
  if (dateFilterActive.value) {
    return '这一天暂时没有命中内容，清掉日期筛选后可以继续沿时间流浏览。'
  }
  if (activeBucket.value === 'inbox') {
    return '这里适合快速分拣新的输入，先丢一条内容进来，我们就能开始整理。'
  }
  if (activeBucket.value === 'collected') {
    return '把真正想沉淀的内容 Collect 起来，这里会逐渐长成你的 retained stream。'
  }
  if (activeBucket.value === 'deleted') {
    return 'Deleted 先作为缓冲区存在，需要的话可以随时恢复到 Inbox。'
  }
  return '输入框、日期和筛选是同一条浏览路径，随便从一个入口开始都可以。'
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

function onMonthChange(monthStart: number) {
  visibleMonthTs.value = monthStart
}

function clearDateSelection() {
  selectedDateTs.value = undefined
  dateFilterActive.value = false
}

function clearSearch() {
  searchQuery.value = ''
}

function setActiveBucket(bucket: DocumentBucket | 'all') {
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

async function restoreCard(slug: string) {
  try {
    await inboxStore.restoreCard(slug)
    message.success('已恢复到 Inbox')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '恢复失败')
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
  void inboxStore.loadCards()
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
  void inboxStore.loadCards()
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
  min-width: 1180px;
  height: 100vh;
  padding: 18px;
  background: var(--bg-primary);
  display: flex;
  gap: 18px;
  overflow: hidden;
}

.left-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 4px 6px 6px;
  min-width: 0;
  overflow: hidden;
}

.nav {
  display: flex;
  align-items: center;
  gap: 14px;
  height: var(--nav-height);
  margin-bottom: 18px;
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
  margin-bottom: 18px;
}

.input-card {
  width: 100%;
  border-radius: 28px;
  box-shadow: 0 10px 28px rgba(40, 32, 16, 0.04);
  background: rgba(255, 251, 242, 0.74);
  border: 1px solid rgba(232, 230, 220, 0.92);
}

.input-card :deep(.n-card__content) {
  padding: 16px 18px 14px;
}

.input-field :deep(.n-input-wrapper) {
  background: transparent;
  padding: 0;
}

.input-field :deep(.n-input__textarea-el) {
  min-height: 88px;
  resize: none;
  font-family: var(--font-body);
  font-size: var(--text-xl);
  color: var(--text-primary);
}

.input-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
}

.attach-btns {
  display: flex;
  gap: 8px;
}

.article-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  position: relative;
  padding-right: 4px;
}

.article-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  position: sticky;
  top: 0;
  z-index: 5;
  padding: 4px 0 10px;
  background: linear-gradient(180deg, var(--bg-primary) 78%, rgba(245, 243, 237, 0));
}

.article-filter-state {
  display: flex;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.article-filters {
  display: inline-flex;
  align-items: center;
  gap: 0;
  padding: 0 2px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(77, 76, 72, 0.08);
  box-shadow: 0 0 0 1px rgba(232, 230, 220, 0.28);
  flex-shrink: 0;
}

.filter-button {
  border: none;
  background: transparent;
  padding: 0 12px;
  height: 32px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  position: relative;
  transition: color var(--transition-base), opacity var(--transition-base), background var(--transition-base);
}

.filter-button:not(:last-child)::after {
  content: '/';
  position: absolute;
  right: -3px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(93, 89, 82, 0.26);
  pointer-events: none;
}

.filter-button:hover {
  color: var(--text-primary);
}

.filter-button.active {
  color: var(--color-primary);
  background: rgba(250, 187, 24, 0.08);
  border-radius: 999px;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(250, 187, 24, 0.12);
  color: var(--text-primary);
  font-size: 14px;
}

.filter-chip.subtle {
  background: rgba(64, 72, 87, 0.06);
}

.filter-chip-label {
  color: var(--text-muted);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.filter-chip-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
}

.clear-filter-btn {
  border: none;
  background: transparent;
  color: var(--color-primary);
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.section-title {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  color: var(--text-primary);
  margin: 18px 0 12px;
}

.cards-grid {
  column-width: 280px;
  column-gap: 18px;
}

.card {
  display: inline-block;
  width: 100%;
  position: relative;
  margin: 0 0 18px;
  background: var(--bg-card);
  border-radius: 26px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  cursor: pointer;
  break-inside: avoid;
  transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base);
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 34px rgba(68, 49, 6, 0.08);
}

.card.collected {
  background:
    radial-gradient(circle at top right, rgba(250, 187, 24, 0.18), transparent 28%),
    linear-gradient(180deg, rgba(255, 248, 224, 0.92), rgba(255, 255, 255, 0.98));
  border-color: rgba(250, 187, 24, 0.4);
  box-shadow: 0 16px 30px rgba(250, 187, 24, 0.14);
}

.card.deleted {
  background: linear-gradient(180deg, rgba(120, 125, 137, 0.05), rgba(255, 255, 255, 0.96));
  border-style: dashed;
  border-color: rgba(120, 125, 137, 0.28);
  box-shadow: none;
}

.card.deleted:hover {
  box-shadow: 0 14px 24px rgba(33, 37, 41, 0.06);
}

.card-image {
  height: 140px;
  background: linear-gradient(135deg, rgba(250, 187, 24, 0.18), rgba(250, 187, 24, 0.04));
}

.card-body {
  padding: 18px 18px 16px;
}

.card-title {
  margin: 0 0 10px;
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
  margin-bottom: 10px;
  overflow: hidden;
  flex-wrap: wrap;
}

.ai-tag {
  flex-shrink: 0;
}

.card-preview {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 14px;
}

.enrich-tag {
  cursor: pointer;
  flex-shrink: 0;
}

.card-actions-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.card-date {
  color: var(--text-muted);
  font-size: 12px;
  white-space: nowrap;
}

.card-actions {
  display: flex;
  gap: 6px;
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
  transition: all var(--transition-base);
}

.icon-action:hover {
  border-color: rgba(64, 72, 87, 0.26);
  background: rgba(64, 72, 87, 0.04);
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
  min-height: 320px;
  border: 1px dashed rgba(93, 89, 82, 0.14);
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.42);
}

.empty-hint {
  margin: 0;
  max-width: 320px;
  color: var(--text-muted);
  line-height: 1.6;
  text-align: center;
}

.right-content {
  width: 344px;
  flex-shrink: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 0;
}

.sidebar-card {
  border-radius: 32px;
  border: 1px solid rgba(232, 230, 220, 0.92);
  box-shadow: 0 10px 28px rgba(40, 32, 16, 0.04);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.84);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sidebar-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--text-primary);
}

.sidebar-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.sidebar-month {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
}

.calendar-card {
  flex: 0 0 auto;
}

.scratchpad-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.scratchpad-card :deep(.n-card__header) {
  flex-shrink: 0;
  padding-bottom: 10px;
}

.scratchpad-card :deep(.n-card__content) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding-top: 0;
}

.scratchpad-modes {
  display: flex;
  gap: var(--space-2);
}

.scratchpad-body {
  flex: 1;
  min-height: 0;
  display: flex;
  height: 100%;
}

.scratchpad-edit,
.scratchpad-preview {
  flex: 1;
  min-height: 0;
  overflow: auto;
  scrollbar-width: none;
}

.scratchpad-edit::-webkit-scrollbar,
.scratchpad-preview::-webkit-scrollbar,
.scratchpad-textarea::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.scratchpad-textarea {
  width: 100%;
  height: 100%;
  min-height: 100%;
  resize: none;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-editor);
  line-height: 1.7;
  overflow: auto;
  scrollbar-width: none;
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

@media (max-width: 1320px) {
  .home-page {
    min-width: 1100px;
  }

  .cards-grid {
    column-width: 240px;
  }
}
</style>
