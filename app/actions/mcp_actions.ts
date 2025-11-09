"use server"

import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { generateMCPToken, hashToken } from "@/lib/mcp-token"

/**
 * Get or create user in database
 */
async function getOrCreateUser(clerkId: string) {
  let user = await prisma.user.findUnique({
    where: { clerk_id: clerkId },
  })

  if (!user) {
    user = await prisma.user.create({
      data: { clerk_id: clerkId },
    })
  }

  return user
}

/**
 * Generate a new MCP access token for the authenticated user
 */
export async function generateMCPAccessToken() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    const user = await getOrCreateUser(userId)

    // Generate new token
    const token = generateMCPToken()
    const tokenHash = hashToken(token)

    // Store hashed token in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        mcp_access_token: tokenHash,
        mcp_token_created_at: new Date(),
      },
    })

    return { success: true, data: { token } }
  } catch (error) {
    console.error("[generateMCPAccessToken] Error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate token",
    }
  }
}

/**
 * Get MCP server configuration JSON for the authenticated user
 * Generates a token if one doesn't exist
 * Note: If a token already exists, it will be regenerated (since we can't retrieve the original)
 */
export async function getMCPConfig() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    const user = await getOrCreateUser(userId)

    // Generate a new token (we can't retrieve the original from hash)
    // In production, you might want to store encrypted tokens or use JWT
    const token = generateMCPToken()
    const tokenHash = hashToken(token)

    // Store hashed token in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        mcp_access_token: tokenHash,
        mcp_token_created_at: new Date(),
      },
    })

    return {
      success: true,
      data: {
        config: {
          mcpServers: {
            inky: {
              command: "npx",
              args: ["-y", "@enkhbold470/inky-mcp-server"],
              env: {
                API_KEY: token,
              },
            },
          },
        },
        token,
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

/**
 * Revoke the current MCP access token
 */
export async function revokeMCPToken() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    const user = await getOrCreateUser(userId)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        mcp_access_token: null,
        mcp_token_created_at: null,
      },
    })

    return { success: true }
  } catch (error) {
    console.error("[revokeMCPToken] Error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to revoke token",
    }
  }
}

