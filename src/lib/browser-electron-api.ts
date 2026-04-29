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
    v2: {
      captureInbox: (content: string, type?: string) =>
        request('/__dev_api/v2/inbox/capture', {
          method: 'POST',
          body: JSON.stringify({ type, content }),
        }),
      listCards: () => request('/__dev_api/v2/cards'),
      setCardBucket: (filename: string, bucket: 'inbox' | 'collected' | 'deleted') =>
        request(`/__dev_api/v2/cards/${encodeURIComponent(filename)}/bucket`, {
          method: 'POST',
          body: JSON.stringify({ bucket }),
        }),
      setCardKind: (filename: string, kind: 'note' | 'todo') =>
        request(`/__dev_api/v2/cards/${encodeURIComponent(filename)}/kind`, {
          method: 'POST',
          body: JSON.stringify({ kind }),
        }),
      readInboxFile: async (filename: string) => {
        const data = await request<{ raw: string | null }>(`/__dev_api/v2/inbox/${encodeURIComponent(filename)}/raw`)
        return data.raw
      },
      writeInboxFile: (filename: string, raw: string) =>
        request(`/__dev_api/v2/inbox/${encodeURIComponent(filename)}/raw`, {
          method: 'POST',
          body: JSON.stringify({ raw }),
        }),
    },
    workspace: {
      list: () => request('/__dev_api/workspace'),
      add: (input) =>
        request('/__dev_api/workspace', {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      remove: (id: string) =>
        request(`/__dev_api/workspace/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        }),
      update: (id: string, patch) =>
        request(`/__dev_api/workspace/${encodeURIComponent(id)}`, {
          method: 'POST',
          body: JSON.stringify(patch),
        }),
      selectFolder: async () => null,
      readTree: (workspaceId?: string) =>
        request(`/__dev_api/workspace/tree${workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ''}`),
      readFile: async (path: string) => {
        const data = await request<{ raw: string | null }>(`/__dev_api/workspace/file?path=${encodeURIComponent(path)}`)
        return data.raw
      },
      writeFile: (path: string, raw: string) =>
        request('/__dev_api/workspace/file', {
          method: 'POST',
          body: JSON.stringify({ path, raw }),
        }),
      createFile: (input) =>
        request('/__dev_api/workspace/file/create', {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      renameFile: (input) =>
        request('/__dev_api/workspace/file/rename', {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      deleteFile: (path: string) =>
        request('/__dev_api/workspace/file', {
          method: 'DELETE',
          body: JSON.stringify({ path }),
        }),
    },
    enrich: {
      listTasks: () => request('/__dev_api/v2/enrich/tasks'),
      createTask: (input) =>
        request('/__dev_api/v2/enrich/tasks', {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      runTask: (id: string) =>
        request(`/__dev_api/v2/enrich/tasks/${encodeURIComponent(id)}/run`, {
          method: 'POST',
        }),
      retryTask: (id: string) =>
        request(`/__dev_api/v2/enrich/tasks/${encodeURIComponent(id)}/retry`, {
          method: 'POST',
        }),
      deleteTask: (id: string) =>
        request(`/__dev_api/v2/enrich/tasks/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        }),
      readOutput: async (path: string) => {
        const data = await request<{ raw: string | null }>(`/__dev_api/v2/enrich/output?path=${encodeURIComponent(path)}`)
        return data.raw
      },
      saveAsArticle: (input) =>
        request('/__dev_api/v2/enrich/save-as-article', {
          method: 'POST',
          body: JSON.stringify(input),
        }),
    },
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
    theme: {
      previewTypora: async () => ({ ok: false, draft: null }),
      saveImported: async () => ({ ok: false }),
      listImported: async () => [],
      listFonts: async () => ['PingFang SC', 'SF Pro Display', 'SF Mono', 'JetBrains Mono', 'serif', 'sans-serif', 'monospace'],
      read: async () => null,
      delete: async () => false,
    },
  }
}

export function ensureElectronApi() {
  if (!window.electronAPI) {
    window.electronAPI = createBrowserElectronApi()
  }
}
