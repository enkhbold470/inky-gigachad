"use server"

import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { generateMCPToken, hashToken, encryptToken, decryptToken } from "@/lib/mcp-token"

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
 * This creates a permanent token that can be retrieved later
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
    const encryptedToken = encryptToken(token)

    // Store both hashed (for verification) and encrypted (for retrieval) tokens
    await prisma.user.update({
      where: { id: user.id },
      data: {
        mcp_access_token: tokenHash,
        mcp_token_encrypted: encryptedToken,
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
 * Uses userId for authentication instead of API tokens
 */
export async function getMCPConfig() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    const user = await getOrCreateUser(userId)

    // Get the base URL for the API
    // Priority: NEXT_PUBLIC_APP_URL > VERCEL_URL > fallback
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!baseUrl && process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`
    }
    if (!baseUrl) {
      baseUrl = "http://localhost:3000"
    }
    // Ensure no trailing slash
    baseUrl = baseUrl.replace(/\/$/, "")

    return {
      success: true,
      data: {
        config: {
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
 * Get current MCP access token (if exists)
 * Returns the actual token if available
 */
export async function getCurrentMCPToken() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    const user = await getOrCreateUser(userId)

    if (!user.mcp_token_encrypted) {
      return { success: true, data: { token: null, hasToken: false } }
    }

    try {
      // Decrypt and return the token
      const token = decryptToken(user.mcp_token_encrypted)
      return {
        success: true,
        data: {
          token,
          hasToken: true,
          createdAt: user.mcp_token_created_at,
        },
      }
    } catch (error) {
      console.error("[getCurrentMCPToken] Failed to decrypt token:", error)
      return {
        success: true,
        data: {
          token: null,
          hasToken: false,
          error: "Failed to decrypt token",
        },
      }
    }
  } catch (error) {
    console.error("[getCurrentMCPToken] Error:", error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get current token",
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
        mcp_token_encrypted: null,
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

