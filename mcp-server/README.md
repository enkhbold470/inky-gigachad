# Inky MCP Server

Simple MCP (Model Context Protocol) server for accessing Inky rules.

## Installation

```bash
cd mcp-server
pnpm install
pnpm build
```

## Usage

Set environment variables:

```bash
export USER_ID="your-clerk-user-id"
export INKY_API_URL="https://your-app.com"  # Optional, defaults to http://localhost:3000
```

Run the server:

```bash
pnpm start
```

Or use directly:

```bash
node index.js
```

## Configuration

The server reads these environment variables:

- `USER_ID` (required) - Your Clerk user ID
- `INKY_API_URL` (optional) - API base URL, defaults to `http://localhost:3000`

## MCP Configuration

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "inky": {
      "command": "node",
      "args": ["/path/to/mcp-server/index.js"],
      "env": {
        "USER_ID": "your-clerk-user-id",
        "INKY_API_URL": "https://your-app.com"
      }
    }
  }
}
```

## Available Tools

- `list_rules` - List all user's rules, optionally filtered by repository

