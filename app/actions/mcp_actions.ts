"use server"

import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

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

