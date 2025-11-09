#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js"

const API_BASE_URL = process.env.INKY_API_URL || "https://api.inky.dev"
const API_KEY = process.env.API_KEY

if (!API_KEY) {
  console.error("Error: API_KEY environment variable is required")
  process.exit(1)
}

interface JsonRpcResponse {
  jsonrpc: string
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
  id?: string | number | null
}

async function callBackendAPI(method: string, params: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}/api/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
      id: Date.now().toString(),
    }),
  })

  if (!response.ok) {
    let errorMessage = "Backend API error"
    try {
      const errorData = (await response.json()) as JsonRpcResponse
      if (errorData.error?.message) {
        errorMessage = errorData.error.message
      }
    } catch {
      // If JSON parsing fails, use default message
    }
    throw new McpError(ErrorCode.InternalError, errorMessage)
  }

  const result = (await response.json()) as JsonRpcResponse
  
  if (result.error) {
    throw new McpError(
      ErrorCode.InternalError,
      result.error.message || "Backend API error",
      result.error.data
    )
  }

  if (!result.result) {
    throw new McpError(ErrorCode.InternalError, "No result from backend API")
  }

  return result.result
}

async function main() {
  const server = new Server(
    {
      name: "inky-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  )

  const transport = new StdioServerTransport()
  await server.connect(transport)

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    try {
      const result = await callBackendAPI("tools/list", {})
      return result as { tools: unknown[] }
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list tools: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  })

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const { name, arguments: args } = request.params
      const result = await callBackendAPI("tools/call", {
        name,
        arguments: args,
      })
      return result as { content: Array<{ type: string; text: string }> }
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to call tool: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  })

  console.error("Inky MCP server running on stdio")
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})

