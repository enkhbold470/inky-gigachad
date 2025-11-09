# Inky MCP Server

MCP (Model Context Protocol) server for Inky that provides access to your personalized coding rules stored in Pinecone. This server acts as a bridge between Cursor IDE and your Inky backend API.

## Overview

The Inky MCP server allows you to access your personalized software rules directly from Cursor IDE. It connects to your hosted Inky API endpoint and retrieves rules from your Pinecone database.

## Features

- ✅ List all your coding rules
- ✅ Filter rules by repository
- ✅ Secure API key authentication
- ✅ JSON-RPC 2.0 protocol compliance
- ✅ Compatible with Cursor IDE

## Installation

### Using npx (Recommended)

```bash
npx -y @enkhbold470/inky-mcp-server
```

### Using npm

```bash
npm install -g @enkhbold470/inky-mcp-server
```

### Using pnpm

```bash
pnpm add -g @enkhbold470/inky-mcp-server
```

## Configuration

### 1. Get Your API Token

First, you need to generate an MCP access token from your Inky account. The token will be in the format `inky_...`.

### 2. Configure Cursor IDE

Add the following configuration to your Cursor settings. The configuration file location depends on your OS:

**macOS/Linux:** `~/.cursor/mcp.json`  
**Windows:** `%APPDATA%\Cursor\mcp.json`

```json
{
  "mcpServers": {
    "inky": {
      "command": "npx",
      "args": ["-y", "@enkhbold470/inky-mcp-server"],
      "env": {
        "API_KEY": "inky_YOUR_TOKEN_HERE",
        "INKY_API_URL": "https://your-domain.com"
      }
    }
  }
}
```

### Environment Variables

- `API_KEY` (required): Your Inky MCP access token (starts with `inky_`)
- `INKY_API_URL` (optional): Your Inky API base URL. Defaults to:
  - `NEXT_PUBLIC_APP_URL` environment variable
  - `http://localhost:3000` if not set

## Usage

Once configured, the MCP server will be available in Cursor IDE. You can use it to:

### List All Rules

Query all your coding rules:

```
List all my coding rules
```

### Filter by Repository

Get rules for a specific repository:

```
Show me rules for repository [repository_id]
```

## API Reference

The MCP server communicates with the Inky backend API using JSON-RPC 2.0 protocol.

### Tools

#### `list_rules`

Lists all user's rules, optionally filtered by repository.

**Parameters:**
- `repository_id` (optional): Filter rules by repository ID

**Example Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "list_rules",
    "arguments": {
      "repository_id": "repo_123"
    }
  },
  "id": 1
}
```

**Example Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "[{\"id\":\"rule_123\",\"name\":\"TypeScript Best Practices\",\"content\":\"...\",\"version\":1,\"is_active\":true,\"repository_id\":\"repo_123\",\"created_at\":\"2024-01-01T00:00:00Z\"}]"
      }
    ]
  },
  "id": 1
}
```

## Development

### Building from Source

```bash
cd packages/mcp-server
pnpm install
pnpm build
```

### Running in Development Mode

```bash
pnpm dev
```

### Testing

You can test the MCP server using the Postman collection included in the main repository (`postman-mcp-collection.json`).

## Architecture

```
┌─────────────┐
│  Cursor IDE │
└──────┬──────┘
       │ stdio
       │
┌──────▼──────────────────┐
│  Inky MCP Server         │
│  (This Package)          │
└──────┬──────────────────┘
       │ HTTP POST
       │ Bearer Token
       │
┌──────▼──────────────────┐
│  Inky Backend API        │
│  /api/mcp                │
└──────┬──────────────────┘
       │
┌──────▼──────────────────┐
│  Pinecone Database       │
│  (User's Rules)          │
└──────────────────────────┘
```

## Security

- API tokens are passed via environment variables (never hardcoded)
- All API requests use Bearer token authentication
- Tokens are hashed and stored securely in the database
- Each user can only access their own rules

## Troubleshooting

### Server Not Starting

**Error:** `Error: API_KEY environment variable is required`

**Solution:** Make sure you've set the `API_KEY` environment variable in your Cursor MCP configuration.

### Connection Errors

**Error:** `Backend API error`

**Solution:** 
1. Verify your `INKY_API_URL` is correct
2. Check that your API token is valid
3. Ensure the backend API is accessible

### No Rules Returned

**Solution:**
1. Verify you have rules created in your Inky account
2. Check that your API token belongs to the correct user
3. Try listing rules without repository filter first

## License

MIT

## Support

For issues and questions, please refer to the main Inky repository.
