"use server"

import { auth } from "@clerk/nextjs/server"

/**
 * Get MCP server configuration for local stdio transport.
 * Recommended for Cursor, Claude Code, Codex, and Windsurf.
 */
export async function getMCPConfig() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    let baseUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!baseUrl && process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`
    }
    if (!baseUrl) {
      baseUrl = "http://localhost:3000"
    }
    baseUrl = baseUrl.replace(/\/$/, "")

    return {
      success: true,
      data: {
        config: {
          mcpServers: {
            inky: {
              command: "npx",
              args: ["-y", "inky-gigachad", "mcp"],
            },
          },
        },
        stdioConfig: {
          mcpServers: {
            inky: {
              command: "npx",
              args: ["-y", "inky-gigachad", "mcp"],
            },
          },
        },
        httpConfig: {
          mcpServers: {
            inky: {
              url: `${baseUrl}/api/mcp`,
              headers: {
                "X-User-Id": userId,
              },
            },
          },
        },
        userId,
        apiUrl: `${baseUrl}/api/mcp`,
        memoryPath: "~/.inky-gigachad/memory.json",
      },
    }
  } catch (error) {
    console.error("[getMCPConfig] Error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get MCP config",
    }
  }
}
