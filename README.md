# Inky Gigachad — Local MCP Memory for AI Coding Tools

**One command. One memory file. Every IDE.**

Inky is a **local-first MCP server** that saves your coding preferences, rules, and project memory in `~/.inky-gigachad/memory.json` — then shares them across **Cursor**, **Claude Code**, **Codex**, **Windsurf**, and any MCP-compatible tool.

No Pinecone. No OpenAI. No cloud required.

```bash
npx -y inky-gigachad mcp
```

## Why developers use Inky

- **Cross-tool memory** — save once in Cursor, read the same context in Claude Code or Codex
- **Local by default** — your data stays on your machine in plain JSON
- **MCP-native** — drop-in config for modern AI coding assistants
- **Zero API keys** — no vector DB, no LLM billing, no signup for the CLI
- **Import existing rules** — pulls from `AGENTS.md`, `CLAUDE.md`, and `.cursor/rules`

## 30-second setup

### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "inky": {
      "command": "npx",
      "args": ["-y", "inky-gigachad", "mcp"]
    }
  }
}
```

### Claude Code

Add to `~/.claude.json` under `mcpServers`:

```json
{
  "mcpServers": {
    "inky": {
      "command": "npx",
      "args": ["-y", "inky-gigachad", "mcp"]
    }
  }
}
```

### Codex / Windsurf

Same config shape — `command: npx`, `args: ["-y", "inky-gigachad", "mcp"]`.

Restart your tool, then ask the agent to call `import_project_rules` or `save_memory`.

## MCP tools

| Tool | What it does |
|------|----------------|
| `save_memory` | Persist a durable preference (e.g. `coding-style`) |
| `get_memory` | Fetch memory by key |
| `list_memories` | List all saved memories |
| `search_memories` | Local text search across memories |
| `save_rule` | Save a coding rule for your assistants |
| `list_rules` | List active rules |
| `search_rules` | Search rules locally |
| `import_project_rules` | Import `AGENTS.md`, `.cursor/rules`, etc. |
| `memory_store_info` | Show path to your local memory file |
| `delete_memory` / `delete_rule` | Remove entries |

## Where data lives

```
~/.inky-gigachad/memory.json
```

Override with:

```bash
export INKY_DATA_DIR=/path/to/dir
# or
export INKY_MEMORY_PATH=/path/to/custom-memory.json
```

## Example workflow

1. Run `npx -y inky-gigachad mcp` via your IDE MCP config
2. Tell your agent: *"Use import_project_rules to load my repo rules"*
3. Save durable prefs: *"Use save_memory with key typescript-style and content prefer functional components"*
4. Switch to another IDE — same memory file, same context

## Optional web dashboard

A lightweight Next.js UI can browse and edit the same local memory file when you run it locally:

```bash
git clone <repository-url>
cd inky-gigachad
pnpm install
pnpm dev
```

Rules are read/written to `~/.inky-gigachad/memory.json` — no database setup required.

## Development

```bash
pnpm install
pnpm build:mcp          # compile MCP CLI
pnpm mcp                # run local MCP server (stdio)
node bin/inky-gigachad.cjs help
```

No database. No migrations. Memory is a JSON file on disk.

## Publish to npm

```bash
pnpm build:mcp
npm publish
```

## Keywords

`mcp` · `cursor` · `claude-code` · `codex` · `windsurf` · `coding-memory` · `local-first` · `developer-tools` · `ai-coding` · `agent-memory`

---

**Inky Gigachad** — your coding memory, everywhere you code. Locally.
