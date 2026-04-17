<template>
  <div class="settings-page">
    <header class="header">
      <button class="back-btn" @click="$router.back()">← 返回</button>
      <h1 class="title">设置</h1>
    </header>

    <div class="body" v-if="settings">
      <!-- AI 配置 -->
      <section class="section">
        <h2 class="section-title">AI 配置</h2>
        <div class="form">
          <label class="form-label">
            <span class="label-text">服务商</span>
            <select class="form-input" v-model="settings.aiProvider">
              <option value="minimax">MiniMax</option>
              <option value="openai">OpenAI</option>
              <option value="ollama">Ollama</option>
            </select>
          </label>
          <label class="form-label">
            <span class="label-text">API Key</span>
            <input class="form-input" type="password" v-model="settings.apiKey" placeholder="sk-..." />
          </label>
          <label class="form-label">
            <span class="label-text">模型</span>
            <input class="form-input" type="text" v-model="settings.model" placeholder="GPT-4o" />
          </label>
          <label class="form-label">
            <span class="label-text">基础 URL（可选）</span>
            <input class="form-input" type="text" v-model="settings.baseUrl" placeholder="https://api.minimax.io" />
          </label>
          <button class="btn-primary" @click="testConnection">测试连接</button>
        </div>
      </section>

      <!-- MCP 服务 -->
      <section class="section">
        <h2 class="section-title">MCP 服务</h2>
        <div class="form">
          <label class="form-label">
            <span class="label-text">HTTP 端口</span>
            <input class="form-input" type="number" v-model="settings.mcpHttpPort" />
          </label>
          <div class="status-row">
            <span>服务状态：</span>
            <span :class="['status-dot', mcpRunning ? 'running' : 'stopped']">
              {{ mcpRunning ? '运行中' : '已停止' }}
            </span>
          </div>
          <div class="config-box">
            <div class="config-header">
              <span class="label-text">MCP Config</span>
              <button class="btn-copy" @click="copyConfig">复制</button>
            </div>
            <textarea class="config-textarea" readonly :value="mcpConfig" rows="10"></textarea>
          </div>
        </div>
      </section>

      <!-- 路径设置 -->
      <section class="section">
        <h2 class="section-title">路径设置</h2>
        <div class="form">
          <label class="form-label">
            <span class="label-text">ai-inbox 目录</span>
            <input class="form-input" type="text" v-model="settings.inboxPath" />
          </label>
          <label class="form-label">
            <span class="label-text">归档目录</span>
            <input class="form-input" type="text" v-model="settings.archivePath" />
          </label>
          <button class="btn-secondary" @click="saveSettings">保存设置</button>
        </div>
      </section>

      <!-- 主题 -->
      <section class="section">
        <h2 class="section-title">主题</h2>
        <div class="form">
          <label class="form-label">
            <span class="label-text">外观</span>
            <select class="form-input" v-model="settings.theme">
              <option value="light">浅色模式</option>
              <option value="dark">深色模式</option>
              <option value="claude">Claude 风格</option>
              <option value="system">跟随系统</option>
            </select>
          </label>
          <button class="btn-secondary" @click="saveSettings">保存</button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const settings = ref<any>(null)
const mcpRunning = ref(false)

onMounted(async () => {
  settings.value = await window.electronAPI?.getSettings()
})

const mcpConfig = computed(() => JSON.stringify({
  mcpServers: {
    'ai-inbox': {
      command: 'node',
      args: ['/Applications/AI-inbox.app/Contents/Resources/mcp-child.js']
    },
    'ai-inbox-http': {
      url: `http://localhost:${settings.value?.mcpHttpPort || 3100}/mcp`
    }
  }
}, null, 2))

async function testConnection() {
  // TODO
}

async function copyConfig() {
  await navigator.clipboard.writeText(mcpConfig.value)
}

async function saveSettings() {
  const plainSettings = JSON.parse(JSON.stringify(settings.value))
  console.log('[SettingsPage] Saving:', plainSettings)
  await window.electronAPI?.saveSettings(plainSettings)
  window.dispatchEvent(new CustomEvent('settings-changed', { detail: plainSettings }))
  console.log('[SettingsPage] Event dispatched')
}
</script>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-primary);
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 32px;
  border-bottom: 1px solid var(--bg-tertiary);
  flex-shrink: 0;
}

.back-btn {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 16px;
  color: var(--text-secondary);
  padding: 8px 12px;
  border-radius: var(--radius-md);
}

.back-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.title {
  font-size: 20px;
  font-weight: 600;
}

.body {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
}

.section {
  margin-bottom: 40px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--bg-tertiary);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 520px;
}

.form-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-input {
  padding: 10px 14px;
  border: 1px solid var(--bg-tertiary);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-link);
}

.form-input::placeholder {
  color: var(--text-muted);
}

.status-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-secondary);
}

.status-dot {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.status-dot::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.running::before {
  background: #1AAE39;
}

.status-dot.stopped::before {
  background: #e74c3c;
}

.config-box {
  border: 1px solid var(--bg-tertiary);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--bg-tertiary);
}

.btn-copy {
  padding: 4px 12px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-copy:hover {
  background: var(--color-link);
  color: white;
}

.config-textarea {
  width: 100%;
  padding: 14px;
  border: none;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
  font-family: 'Source Code Pro', monospace;
  line-height: 1.6;
  resize: vertical;
}

.config-textarea:focus {
  outline: none;
}

.btn-primary {
  padding: 10px 20px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--status-finished);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  align-self: flex-start;
  transition: opacity 0.2s;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-secondary {
  padding: 10px 20px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  align-self: flex-start;
  transition: background 0.2s;
}

.btn-secondary:hover {
  background: var(--color-link);
  color: white;
}
</style>
