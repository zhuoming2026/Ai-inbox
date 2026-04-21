async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  })

  if (!response.ok) {
    let message = `Request failed: ${response.status}`
    try {
      const data = await response.json()
      message = data?.error || message
    } catch {
      const text = await response.text()
      if (text) message = text
    }
    throw new Error(message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

type BrowserElectronApi = NonNullable<Window['electronAPI']>

function createBrowserElectronApi(): BrowserElectronApi {
  return {
    getSettings: () => request('/__dev_api/settings'),
    saveSettings: (settings: any) =>
      request('/__dev_api/settings', {
        method: 'POST',
        body: JSON.stringify(settings),
      }),
    testAiConnection: (settings: any) =>
      request('/__dev_api/ai/test', {
        method: 'POST',
        body: JSON.stringify(settings),
      }),
    readScratchpad: async () => {
      const data = await request<{ content: string }>('/__dev_api/scratchpad')
      return data.content
    },
    writeScratchpad: (content: string) =>
      request('/__dev_api/scratchpad', {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    listInbox: () => request('/__dev_api/inbox'),
    readFile: (slug: string) => request(`/__dev_api/inbox/${encodeURIComponent(slug)}`),
    readRawFile: async (slug: string) => {
      const data = await request<{ raw: string | null }>(`/__dev_api/inbox/${encodeURIComponent(slug)}/raw`)
      return data.raw
    },
    updateFile: (slug: string, data: any) =>
      request(`/__dev_api/inbox/${encodeURIComponent(slug)}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    writeRawFile: (slug: string, raw: string) =>
      request(`/__dev_api/inbox/${encodeURIComponent(slug)}/raw`, {
        method: 'POST',
        body: JSON.stringify({ raw }),
      }),
    deleteFile: (slug: string) =>
      request(`/__dev_api/inbox/${encodeURIComponent(slug)}`, {
        method: 'DELETE',
      }),
    archiveFile: (slug: string) =>
      request(`/__dev_api/inbox/${encodeURIComponent(slug)}/archive`, {
        method: 'POST',
      }),
    setBucket: (slug: string, bucket: 'inbox' | 'collected' | 'deleted') =>
      request(`/__dev_api/inbox/${encodeURIComponent(slug)}/bucket`, {
        method: 'POST',
        body: JSON.stringify({ bucket }),
      }),
    processInput: (type: string, content: string) =>
      request('/__dev_api/process-input', {
        method: 'POST',
        body: JSON.stringify({ type, content }),
      }),
    enrichFile: (slug: string) =>
      request(`/__dev_api/inbox/${encodeURIComponent(slug)}/enrich`, {
        method: 'POST',
      }),
    getMcpStatus: async () => ({
      running: false,
      error: '浏览器开发模式不提供内置 MCP，请在 Electron 应用中手动启动。',
    }),
    startMcp: async () => ({
      running: false,
      error: '浏览器开发模式不支持启动内置 MCP，请使用 Electron 应用。',
    }),
    stopMcp: async () => ({
      running: false,
      error: null,
    }),
    captureScreenshot: async () => null,
    selectFolder: async () => null,
    onInboxUpdate: (cb: () => void) => {
      const source = new EventSource('/__dev_api/events')
      source.addEventListener('inbox-updated', () => cb())
      source.onerror = () => {}
      return () => source.close()
    },
  }
}

export function ensureElectronApi() {
  if (!window.electronAPI) {
    window.electronAPI = createBrowserElectronApi()
  }
}
