#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import * as z from 'zod/v4'

const API_BASE = process.env.HERMES_API_BASE ?? 'http://127.0.0.1:8642/v1/chat/completions'
const API_KEY = process.env.HERMES_API_KEY ?? 'change-me-local-dev'
const MODEL = process.env.HERMES_MODEL ?? 'hermes-agent'

function printHelp() {
  console.error(`Hermes MCP Server

Exposes one tool:
  hermes_execute(prompt: string)

Environment:
  HERMES_API_BASE  default: http://127.0.0.1:8642/v1/chat/completions
  HERMES_API_KEY   default: change-me-local-dev
  HERMES_MODEL     default: hermes-agent

Run:
  node ./scripts/hermes-mcp-server.mjs
  npm run hermes:mcp
`)
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  printHelp()
  process.exit(0)
}

async function callHermes(prompt) {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Hermes API request failed with ${response.status}: ${text}`)
  }

  const json = await response.json()
  const content = json?.choices?.[0]?.message?.content

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Hermes API response did not include assistant text content.')
  }

  return {
    text: content.trim(),
    raw: json,
  }
}

const server = new McpServer({
  name: 'hermes-local-bridge',
  version: '1.0.0',
})

server.registerTool(
  'hermes_execute',
  {
    description: 'Send a prompt to the local Hermes API server and return the assistant text response.',
    inputSchema: {
      prompt: z.string().min(1).describe('The prompt to send to Hermes.'),
    },
  },
  async ({ prompt }) => {
    try {
      const result = await callHermes(prompt)

      return {
        content: [
          {
            type: 'text',
            text: result.text,
          },
        ],
        structuredContent: {
          model: MODEL,
          apiBase: API_BASE,
          response: result.raw,
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        content: [
          {
            type: 'text',
            text: message,
          },
        ],
        isError: true,
      }
    }
  }
)

const transport = new StdioServerTransport()
await server.connect(transport)
