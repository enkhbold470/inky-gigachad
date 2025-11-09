# Cursor MCP Configuration Fix

## Issue

Your Cursor MCP configuration is missing the `/api/mcp` path in the URL.

## Current (Incorrect) Configuration

```json
{
  "inky": {
    "url": "https://inky-gigachad.vercel.app",
    "headers": {
      "X-User-Id": "user_35DB5vULiQ5W5A6FPIrMfOddncN"
    }
  }
}
```

## Correct Configuration

```json
{
  "mcpServers": {
    "inky": {
      "url": "https://inky-gigachad.vercel.app/api/mcp",
      "headers": {
        "X-User-Id": "user_35DB5vULiQ5W5A6FPIrMfOddncN"
      }
    }
  }
}
```

## Key Changes

1. **Added `mcpServers` wrapper** - Cursor requires this top-level key
2. **Added `/api/mcp` to URL** - The endpoint path is required

## Steps to Fix

1. Open your Cursor MCP config file:
   - **macOS/Linux:** `~/.cursor/mcp.json`
   - **Windows:** `%APPDATA%\Cursor\mcp.json`

2. Replace your configuration with the correct one above

3. **Restart Cursor IDE** (important!)

4. Test by asking Cursor: "List all my coding rules"

## Verification

After updating, you should see:
- ✅ MCP server appears in Cursor's MCP servers list
- ✅ No connection errors
- ✅ Can call `list_rules` tool successfully

## Troubleshooting

If it still doesn't work:

1. **Check Cursor logs** - Look for MCP connection errors
2. **Verify URL** - Make sure it's exactly `https://inky-gigachad.vercel.app/api/mcp`
3. **Check headers** - Ensure `X-User-Id` header is set correctly
4. **Test with curl** first:
   ```bash
   curl -X POST https://inky-gigachad.vercel.app/api/mcp \
     -H "Content-Type: application/json" \
     -H "X-User-Id: user_35DB5vULiQ5W5A6FPIrMfOddncN" \
     -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}'
   ```

