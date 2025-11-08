"use server"

import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { createRuleSchema, updateRuleSchema, type CreateRuleInput, type UpdateRuleInput } from "@/lib/validations"
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
 * Create a new rule with versioning support
 */
export async function createRule(input: CreateRuleInput) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    const validated = createRuleSchema.parse(input)
    const user = await getOrCreateUser(userId)

    // Create rule in database
    const rule = await prisma.rule.create({
      data: {
        user_id: user.id,
        repository_id: validated.repository_id,
        name: validated.name,
        content: validated.content,
        version: 1,
      },
      select: {
        id: true,
        name: true,
        content: true,
        version: true,
        created_at: true,
      },
    })

    return { success: true, data: rule }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Validation failed", details: error.issues }
    }
    console.error("Error creating rule:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to create rule" }
  }
}

/**
 * Update a rule (creates a new version)
 */
export async function updateRule(input: UpdateRuleInput) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    const validated = updateRuleSchema.parse(input)
    const user = await getOrCreateUser(userId)

    // Get existing rule
    const existingRule = await prisma.rule.findFirst({
      where: {
        id: validated.id,
        user_id: user.id,
      },
    })

    if (!existingRule) {
      return { success: false, error: "Rule not found" }
    }

    // Create new version
    const newVersion = existingRule.version + 1
    const updatedName = validated.name ?? existingRule.name
    const updatedContent = validated.content ?? existingRule.content

    // Create new version in database
    const newRule = await prisma.rule.create({
      data: {
        user_id: user.id,
        repository_id: existingRule.repository_id,
        name: updatedName,
        content: updatedContent,
        version: newVersion,
        parent_rule_id: existingRule.id,
        is_active: validated.is_active ?? existingRule.is_active,
      },
      select: {
        id: true,
        name: true,
        content: true,
        version: true,
        created_at: true,
      },
    })

    return { success: true, data: newRule }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Validation failed", details: error.issues }
    }
    console.error("Error updating rule:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to update rule" }
  }
}

/**
 * Get user's rules
 */
export async function getUserRules(repositoryId?: string) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    const user = await getOrCreateUser(userId)

    const rules = await prisma.rule.findMany({
      where: {
        user_id: user.id,
        ...(repositoryId ? { repository_id: repositoryId } : {}),
      },
      orderBy: [
        { created_at: "desc" },
      ],
      select: {
        id: true,
        name: true,
        content: true,
        version: true,
        is_active: true,
        repository_id: true,
        created_at: true,
        updated_at: true,
      },
    })

    return { success: true, data: rules }
  } catch (error) {
    console.error("Error fetching rules:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch rules" }
  }
}

/**
 * Get rule by ID
 */
export async function getRuleById(ruleId: string) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    const user = await getOrCreateUser(userId)

    const rule = await prisma.rule.findFirst({
      where: {
        id: ruleId,
        user_id: user.id,
      },
      select: {
        id: true,
        name: true,
        content: true,
        version: true,
        is_active: true,
        repository_id: true,
        parent_rule_id: true,
        created_at: true,
        updated_at: true,
      },
    })

    if (!rule) {
      return { success: false, error: "Rule not found" }
    }

    return { success: true, data: rule }
  } catch (error) {
    console.error("Error fetching rule:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch rule" }
  }
}

/**
 * Delete a rule
 */
export async function deleteRule(ruleId: string) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    const user = await getOrCreateUser(userId)

    const rule = await prisma.rule.findFirst({
      where: {
        id: ruleId,
        user_id: user.id,
      },
    })

    if (!rule) {
      return { success: false, error: "Rule not found" }
    }

    // Delete from database
    await prisma.rule.delete({
      where: { id: ruleId },
    })

    return { success: true }
  } catch (error) {
    console.error("Error deleting rule:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete rule" }
  }
}

/**
 * Search rules using text search
 */
export async function searchRules(query: string, repositoryId?: string, topK: number = 5) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    const user = await getOrCreateUser(userId)

    // Simple text search in database
    const rules = await prisma.rule.findMany({
      where: {
        user_id: user.id,
        ...(repositoryId ? { repository_id: repositoryId } : {}),
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
        ],
      },
      take: topK,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        name: true,
        content: true,
        version: true,
        is_active: true,
        repository_id: true,
        created_at: true,
      },
    })

    return { success: true, data: rules }
  } catch (error) {
    console.error("Error searching rules:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to search rules" }
  }
}

