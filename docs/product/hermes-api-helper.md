# Hermes API Helper

This repo includes a tiny helper for calling the local Hermes API server.

## Purpose

Use Hermes as a secondary reviewer or idea generator while Codex keeps the main implementation and integration flow inside this repo.

This is especially useful for:

- getting a second opinion on editor integration details
- asking Hermes to review a patch plan before we implement it
- checking UI/UX tradeoffs without leaving the terminal

## Helper script

Run:

```bash
./scripts/hermes-chat.sh "Please review this editor integration plan in one paragraph."
```

Or:

```bash
npm run hermes:ask -- "Please suggest a safer bubble-menu implementation."
```

You can also pipe a longer prompt:

```bash
cat prompt.txt | ./scripts/hermes-chat.sh
```

## Defaults

- API base: `http://127.0.0.1:8642/v1/chat/completions`
- API key: `change-me-local-dev`
- model: `hermes-agent`

## Environment overrides

```bash
HERMES_API_BASE=http://127.0.0.1:8642/v1/chat/completions
HERMES_API_KEY=change-me-local-dev
HERMES_MODEL=hermes-agent
HERMES_RAW_OUTPUT=1
```

Notes:

- `HERMES_RAW_OUTPUT=1` prints the full JSON response.
- By default the script prints only the assistant text.

## MCP bridge

This repo also includes a tiny stdio MCP server:

```bash
npm run hermes:mcp
```

It exposes one tool:

- `hermes_execute(prompt: string)`

The tool internally calls the same local Hermes API endpoint and returns the assistant text as MCP tool output.

Example Codex MCP config:

```json
{
  "mcpServers": {
    "hermes-local": {
      "command": "node",
      "args": ["/Users/zhuoming/lzm/CodeZone/ai-inbox-app/scripts/hermes-mcp-server.mjs"]
    }
  }
}
```

You can also point it at a different Hermes API instance with:

```bash
HERMES_API_BASE=http://127.0.0.1:8642/v1/chat/completions
HERMES_API_KEY=change-me-local-dev
HERMES_MODEL=hermes-agent
```

## Codex usage note

Inside Codex, local HTTP calls to `127.0.0.1` may require running outside the sandbox. The helper itself is still useful because it standardizes the request shape and endpoint.

## Suggested workflow

1. Codex owns the main implementation in `ai-inbox-app`.
2. Hermes is used as a lightweight external reviewer for specific questions.
3. Keep Hermes tasks narrow and concrete.

Examples:

- "Review this slash-command plan and list the top 3 risks."
- "Given this Vue component, suggest why the bubble menu is rendering inline instead of floating."
- "Compare two icon strategies for this editor: reusing `@vicons/ionicons5` vs adding a new icon pipeline."
