#!/usr/bin/env node

/**
 * Simple MCP Server for Inky
 * Connects to the Inky API to access user rules via stdio
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const API_URL = "https://inky-gigachad.vercel.app";
const USER_ID = process.env.USER_ID;

if (!USER_ID) {
  console.error("Error: USER_ID environment variable is required");
  process.exit(1);
}

async function main() {
  console.error(`[inky-mcp-server] Starting MCP server for user: ${USER_ID}`);
  console.error(`[inky-mcp-server] API URL: ${API_URL}`);

  const transport = new StdioServerTransport();
  const server = new Server(
    {
      name: "inky-mcp-server",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler("tools/list", async () => {
    return {
      tools: [
        {
          name: "list_rules",
          description: "List all user's rules, optionally filtered by repository",
          inputSchema: {
            type: "object",
            properties: {
              repository_id: {
                type: "string",
                description: "Optional repository ID to filter rules",
              },
            },
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler("tools/call", async (request: CallToolRequestSchema) => {
    const { name, arguments: args } = request.params;

    if (name === "list_rules") {
      try {
        const { repository_id } = (args as { repository_id?: string }) || {};
        
        const response = await fetch(`${API_URL}/api/mcp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Id": USER_ID!,
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
              name: "list_rules",
              arguments: repository_id ? { repository_id } : {},
            },
            id: 1,
          }),
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.error) {
          throw new Error(result.error.message || "Unknown error");
        }

        return result.result;
      } catch (error) {
        console.error(`[inky-mcp-server] Error calling list_rules:`, error);
        throw error;
      }
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  await server.connect(transport);
  console.error("[inky-mcp-server] MCP server ready");
}

main().catch((error) => {
  console.error("[inky-mcp-server] Fatal error:", error);
  process.exit(1);
});