# MCP Server Configuration Guide

Your MCP server uses **userId** for authentication instead of API keys. Here's how to configure it:

## Quick Steps

1. **Get your MCP configuration**:
   - Go to your dashboard/onboard page
   - Navigate to the "Tools" section
   - The system will automatically generate the configuration with your userId
   - Copy the configuration JSON

2. **Your userId is automatically included**:
   - No need to generate or manage tokens
   - Your Clerk userId is used directly for authentication
   - The configuration includes your userId in the headers

3. **Use your configuration**:
   - HTTP Transport: Uses `X-User-Id` header
   - Stdio Transport: Uses `USER_ID` environment variable

## Configuration Formats

### HTTP Transport
```json
{
  "mcpServers": {
    "inky": {
      "url": "https://your-app.com/api/mcp",
      "headers": {
        "X-User-Id": "user_xxxxx"
      }
    }
  }
}
```

### Stdio Transport
```json
{
  "mcpServers": {
    "inky": {
      "command": "npx",
      "args": ["-y", "inky-mcp-server"],
      "env": {
        "USER_ID": "user_xxxxx",
        "INKY_API_URL": "https://your-app.com"
      }
    }
  }
}
```

## API Endpoints

### Get MCP Configuration
```typescript
import { getMCPConfig } from '@/app/actions/mcp_actions'

const result = await getMCPConfig()
if (result.success) {
  console.log('MCP Config:', result.data.config)
  console.log('Your User ID:', result.data.userId)
}
```

## How It Works

- **Authentication**: Uses Clerk `userId` directly
- **No Tokens**: No need to generate, store, or manage API tokens
- **Simplified**: Just use your userId in the configuration
- **Secure**: Authentication happens server-side via Clerk

## Migration Notes

If you were using API tokens before:
- Old tokens are no longer needed
- Simply use the new configuration with userId
- The system automatically uses your authenticated userId

## Important Notes

- ✅ Your userId is automatically retrieved from Clerk authentication
- ✅ No need to manage tokens or keys
- ✅ Configuration is generated automatically when you visit the tools page
- ✅ Works with both HTTP and Stdio transports
