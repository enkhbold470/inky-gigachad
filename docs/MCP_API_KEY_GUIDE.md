# MCP Setup Guide — Inky Gigachad (Local)

## Recommended: local stdio (no API keys)

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

Paste the config above, restart Cursor, then verify Inky appears in MCP tools.

## Claude Code

File: `~/.claude.json` — add under `mcpServers`.

## Optional: hosted HTTP transport

If you use the Inky web dashboard with Clerk auth:

```json
{
  "mcpServers": {
    "inky": {
      "url": "http://localhost:3000/api/mcp",
      "headers": {
        "X-User-Id": "user_xxxxx"
      }
    }
  }
}
```

Replace `user_xxxxx` with your Clerk user ID from the onboard flow.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `INKY_DATA_DIR` | Directory for memory file (default `~/.inky-gigachad`) |
| `INKY_MEMORY_PATH` | Full path to custom memory JSON file |

## Troubleshooting

- Run `npx -y inky-gigachad help` to verify the CLI is installed.
- Check `memory_store_info` tool output for the active store path.
- Ensure Node.js 18+ is available to your IDE shell.
