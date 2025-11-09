# @inky/mcp - MCP Server for Inky

MCP (Model Context Protocol) server for accessing your personalized Inky coding rules.

## Installation

This package is automatically installed when you configure Inky in your MCP client.

## Configuration

Add the following to your MCP client configuration:

```json
{
  "mcpServers": {
    "inky": {
      "command": "npx",
      "args": ["-y", "@inky/mcp"],
      "env": {
        "API_KEY": "<your-api-key>",
        "INKY_API_URL": "https://api.inky.dev"
      }
    }
  }
}
```

## Environment Variables

- `API_KEY` (required): Your Inky MCP access token
- `INKY_API_URL` (optional): Base URL for the Inky API (defaults to `https://api.inky.dev`)

## Available Tools

- `search_rules`: Search your coding rules using semantic similarity
- `get_rule`: Get a specific rule by ID
- `list_rules`: List all your rules

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run in development mode
pnpm dev
```

## License

MIT

