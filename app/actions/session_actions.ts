"use server"

import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { createSessionSchema, updateSessionSchema, type CreateSessionInput, type UpdateSessionInput } from "@/lib/validations"
import { searchRules } from "./rule_actions"
import { z } from "zod"

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
 * Create a new coding session
 */
export async function createSession(input: CreateSessionInput) {
  console.log("[createSession] Server action called")
  console.log("[createSession] Input:", { title: input.title, repository_id: input.repository_id })
  
  try {
    console.log("[createSession] Authenticating user...")
    const { userId } = await auth()
    console.log("[createSession] User ID:", userId ? "✓ Found" : "✗ Not found")
    
    if (!userId) {
      console.error("[createSession] ✗ User not authenticated")
      return { success: false, error: "Not authenticated" }
    }

    console.log("[createSession] Validating input...")
    const validated = createSessionSchema.parse(input)
    console.log("[createSession] ✓ Validation passed")
    
    console.log("[createSession] Getting or creating user...")
    const user = await getOrCreateUser(userId)
    console.log("[createSession] User ID:", user.id)

    console.log("[createSession] Creating session in database...")
    const session = await prisma.codingSession.create({
      data: {
        user_id: user.id,
        repository_id: validated.repository_id,
        title: validated.title,
        description: validated.description,
        context: validated.context,
      },
      select: {
        id: true,
        title: true,
        description: true,
        context: true,
        repository_id: true,
        started_at: true,
        is_active: true,
      },
    })

    // If context is provided, automatically search and link relevant rules
    if (validated.context) {
      console.log("[createSession] Context provided, searching for relevant rules...")
      const searchResult = await searchRules(validated.context, validated.repository_id, 5)
      if (searchResult.success && searchResult.data) {
        console.log("[createSession] Found", searchResult.data.length, "relevant rules, linking...")
        await Promise.all(
          searchResult.data.map((rule) =>
            prisma.codingSessionRule.create({
              data: {
                session_id: session.id,
                rule_id: rule.id,
              },
            })
          )
        )
        console.log("[createSession] ✓ Rules linked successfully")
      }
    }

    console.log("[createSession] ✅ Session created successfully:", session.id)
    return { success: true, data: session }
  } catch (error) {
    console.error("[createSession] ✗ Error occurred:", error)
    if (error instanceof z.ZodError) {
      console.error("[createSession] Validation errors:", error.issues)
      return { success: false, error: "Validation failed", details: error.issues }
    }
    console.error("[createSession] ✗ Failed to create session:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to create session" }
  }
}

/**
 * Update a coding session
 */
export async function updateSession(input: UpdateSessionInput) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    const validated = updateSessionSchema.parse(input)
    const user = await getOrCreateUser(userId)

    const existingSession = await prisma.codingSession.findFirst({
      where: {
        id: validated.id,
        user_id: user.id,
      },
    })

    if (!existingSession) {
      return { success: false, error: "Session not found" }
    }

    const session = await prisma.codingSession.update({
      where: { id: validated.id },
      data: {
        title: validated.title,
        description: validated.description,
        context: validated.context,
        is_active: validated.is_active,
        ...(validated.is_active === false ? { ended_at: new Date() } : {}),
      },
      select: {
        id: true,
        title: true,
        description: true,
        context: true,
        repository_id: true,
        started_at: true,
        ended_at: true,
        is_active: true,
        updated_at: true,
      },
    })

    // If context was updated, refresh linked rules
    if (validated.context !== undefined && validated.context !== existingSession.context) {
      // Delete existing rule links
      await prisma.codingSessionRule.deleteMany({
        where: { session_id: session.id },
      })

      // Search and link new rules
      if (validated.context) {
        const searchResult = await searchRules(validated.context, session.repository_id || undefined, 5)
        if (searchResult.success && searchResult.data) {
          await Promise.all(
            searchResult.data.map((rule) =>
              prisma.codingSessionRule.create({
                data: {
                  session_id: session.id,
                  rule_id: rule.id,
                },
              })
            )
          )
        }
      }
    }

    return { success: true, data: session }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Validation failed", details: error.issues }
    }
    console.error("Error updating session:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to update session" }
  }
}

/**
 * Get user's coding sessions
 */
export async function getUserSessions(repositoryId?: string, activeOnly: boolean = false) {
  console.log("[getUserSessions] Server action called")
  console.log("[getUserSessions] Repository ID:", repositoryId || "none", "| Active only:", activeOnly)
  
  try {
    console.log("[getUserSessions] Authenticating user...")
    const { userId } = await auth()
    console.log("[getUserSessions] User ID:", userId ? "✓ Found" : "✗ Not found")
    
    if (!userId) {
      console.error("[getUserSessions] ✗ User not authenticated")
      return { success: false, error: "Not authenticated" }
    }

    console.log("[getUserSessions] Getting or creating user...")
    const user = await getOrCreateUser(userId)
    console.log("[getUserSessions] User ID:", user.id)

    console.log("[getUserSessions] Fetching sessions from database...")
    const sessions = await prisma.codingSession.findMany({
      where: {
        user_id: user.id,
        ...(repositoryId ? { repository_id: repositoryId } : {}),
        ...(activeOnly ? { is_active: true } : {}),
      },
      orderBy: { started_at: "desc" },
      include: {
        repository: {
          select: {
            id: true,
            name: true,
            full_name: true,
          },
        },
        rules: {
          include: {
            rule: {
              select: {
                id: true,
                name: true,
                content: true,
                version: true,
              },
            },
          },
          orderBy: { relevance_score: "desc" },
        },
      },
    })

    console.log("[getUserSessions] ✅ Found", sessions.length, "sessions")
    return { success: true, data: sessions }
  } catch (error) {
    console.error("[getUserSessions] ✗ Error fetching sessions:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch sessions" }
  }
}

/**
 * Get session by ID with full details
 */
export async function getSessionById(sessionId: string) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    const user = await getOrCreateUser(userId)

    const session = await prisma.codingSession.findFirst({
      where: {
        id: sessionId,
        user_id: user.id,
      },
      include: {
        repository: {
          select: {
            id: true,
            name: true,
            full_name: true,
            html_url: true,
          },
        },
        rules: {
          include: {
            rule: {
              select: {
                id: true,
                name: true,
                content: true,
                version: true,
                is_active: true,
              },
            },
          },
          orderBy: { relevance_score: "desc" },
        },
      },
    })

    if (!session) {
      return { success: false, error: "Session not found" }
    }

    return { success: true, data: session }
  } catch (error) {
    console.error("Error fetching session:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch session" }
  }
}

/**
 * End a coding session
 */
export async function endSession(sessionId: string) {
  console.log("[endSession] Server action called")
  console.log("[endSession] Session ID:", sessionId)
  
  try {
    console.log("[endSession] Authenticating user...")
    const { userId } = await auth()
    console.log("[endSession] User ID:", userId ? "✓ Found" : "✗ Not found")
    
    if (!userId) {
      console.error("[endSession] ✗ User not authenticated")
      return { success: false, error: "Not authenticated" }
    }

    console.log("[endSession] Getting or creating user...")
    const user = await getOrCreateUser(userId)
    console.log("[endSession] User ID:", user.id)

    console.log("[endSession] Checking if session exists...")
    const session = await prisma.codingSession.findFirst({
      where: {
        id: sessionId,
        user_id: user.id,
      },
    })

    if (!session) {
      console.error("[endSession] ✗ Session not found")
      return { success: false, error: "Session not found" }
    }

    console.log("[endSession] Ending session...")
    const updated = await prisma.codingSession.update({
      where: { id: sessionId },
      data: {
        is_active: false,
        ended_at: new Date(),
      },
    })

    console.log("[endSession] ✅ Session ended successfully")
    return { success: true, data: updated }
  } catch (error) {
    console.error("[endSession] ✗ Error ending session:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to end session" }
  }
}

/**
 * Add a rule to a session manually
 */
export async function addRuleToSession(sessionId: string, ruleId: string) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    const user = await getOrCreateUser(userId)

    // Verify session belongs to user
    const session = await prisma.codingSession.findFirst({
      where: {
        id: sessionId,
        user_id: user.id,
      },
    })

    if (!session) {
      return { success: false, error: "Session not found" }
    }

    // Verify rule belongs to user
    const rule = await prisma.rule.findFirst({
      where: {
        id: ruleId,
        user_id: user.id,
      },
    })

    if (!rule) {
      return { success: false, error: "Rule not found" }
    }

    // Add rule to session
    const sessionRule = await prisma.codingSessionRule.create({
      data: {
        session_id: sessionId,
        rule_id: ruleId,
      },
      include: {
        rule: {
          select: {
            id: true,
            name: true,
            content: true,
            version: true,
          },
        },
      },
    })

    return { success: true, data: sessionRule }
  } catch (error) {
    console.error("Error adding rule to session:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to add rule to session" }
  }
}

