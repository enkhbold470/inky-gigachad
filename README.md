# inky-gigachad

Local MCP memory shared across Cursor, Claude Code, Codex, and Windsurf.

## With npm (after publish)

```bash
npx -y inky-gigachad mcp
```

> Package is **not on npm yet**. See [PUBLISH.md](./PUBLISH.md) to publish, or use local install below.

## Without npm (works now)

```bash
git clone https://github.com/enkhbold470/inky-gigachad
cd inky-gigachad
pnpm install && pnpm build
pnpm mcp
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

Use `"command": "node", "args": ["/absolute/path/to/inky-gigachad/bin/inky-gigachad.cjs", "mcp"]` before npm publish.

## Tools

`save_memory` · `get_memory` · `list_memories` · `search_memories` · `save_rule` · `list_rules` · `search_rules` · `import_project_rules` · `memory_store_info` · `delete_memory` · `delete_rule`

## Dev / test

```bash
pnpm install
pnpm build
pnpm test          # smoke + all 11 tools + local pack install
pnpm test:tools    # human-like test every MCP tool
pnpm mcp
```
