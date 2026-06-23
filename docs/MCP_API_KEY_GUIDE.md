# MCP Setup Guide — Inky Gigachad (Local)

## Setup (no database, no API keys)

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

Memory is stored at `~/.inky-gigachad/memory.json`.

## Cursor

File: `~/.cursor/mcp.json` (or project `.cursor/mcp.json`)

## Claude Code

File: `~/.claude.json` — add under `mcpServers`.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `INKY_DATA_DIR` | Directory for memory file (default `~/.inky-gigachad`) |
| `INKY_MEMORY_PATH` | Full path to custom memory JSON file |

## Troubleshooting

- Run `npx -y inky-gigachad help` to verify the CLI is installed.
- Check `memory_store_info` tool output for the active store path.
- Ensure Node.js 18+ is available to your IDE shell.
