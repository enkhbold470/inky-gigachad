# Testing Inky MCP Server

## Method 1: Test Locally (Development)

### Step 1: Build the package

```bash
cd packages/mcp-server
pnpm install
pnpm build
```

### Step 2: Test with environment variables

```bash
# Set your API key and URL
export API_KEY="inky_YOUR_TOKEN_HERE"
export INKY_API_URL="http://localhost:3000"  # or your production URL

# Run the server
node dist/index.js
```

The server will run on stdio and wait for MCP protocol messages.

## Method 2: Test via npx (After Publishing)

### Option A: Using the binary name directly

```bash
API_KEY="inky_YOUR_TOKEN_HERE" INKY_API_URL="http://localhost:3000" npx -y inky-mcp-server inky-mcp
```

### Option B: Link locally for testing

```bash
cd packages/mcp-server
pnpm link

# In another terminal
API_KEY="inky_YOUR_TOKEN_HERE" INKY_API_URL="http://localhost:3000" inky-mcp
```

## Method 3: Test the API Endpoint Directly (Recommended)

Since the MCP server is just a proxy to your API, you can test the API endpoint directly using the Postman collection:

### Using Postman

1. Import `postman-mcp-collection.json` from the root directory
2. Set collection variables:
   - `base_url`: `http://localhost:3000` (or your production URL)
   - `mcp_token`: Your `inky_...` token
3. Run "List Tools" request
4. Run "List All Rules" request

### Using curl

```bash
# List tools
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer inky_YOUR_TOKEN_HERE" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 1
  }'

# List all rules
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer inky_YOUR_TOKEN_HERE" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "list_rules",
      "arguments": {}
    },
    "id": 2
  }'
```

## Method 4: Test in Cursor IDE

1. Generate an MCP token from your Inky app (via `getMCPConfig()` server action)
2. Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "inky": {
      "command": "npx",
      "args": ["-y", "inky-mcp-server"],
      "env": {
        "API_KEY": "inky_YOUR_TOKEN_HERE",
        "INKY_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

3. Restart Cursor IDE
4. Try asking: "List all my coding rules"

## Troubleshooting

### Error: "command not found"

If you get `sh: inky-mcp: command not found`, try:
- Use `npx -y inky-mcp-server` (npx will handle the binary)
- Or use the full path: `node node_modules/inky-mcp-server/dist/index.js`

### Error: "API_KEY environment variable is required"

Make sure you've set the `API_KEY` environment variable before running the server.

### Error: "Backend API error"

- Verify your backend is running
- Check that `INKY_API_URL` is correct
- Verify your API token is valid
- Check backend logs for errors

