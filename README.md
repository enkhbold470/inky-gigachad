# inky-gigachad

Local MCP memory shared across Cursor, Claude Code, Codex, and Windsurf.

```bash
npx -y inky-gigachad mcp
```

Memory file: `~/.inky-gigachad/memory.json`

## Config

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

## Tools

`save_memory` · `get_memory` · `list_memories` · `search_memories` · `save_rule` · `list_rules` · `search_rules` · `import_project_rules` · `memory_store_info` · `delete_memory` · `delete_rule`

## Dev

```bash
pnpm install
pnpm build
pnpm test
pnpm mcp
```
