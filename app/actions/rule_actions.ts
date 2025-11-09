"use server"

import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { generateEmbedding } from "@/lib/embeddings"
import { getPineconeIndex } from "@/lib/pinecone"
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
  console.log("[createRule] Server action called")
  console.log("[createRule] Input:", { name: input.name, repository_id: input.repository_id })
  
  try {
    console.log("[createRule] Authenticating user...")
    const { userId } = await auth()
    console.log("[createRule] User ID:", userId ? "✓ Found" : "✗ Not found")
    
    if (!userId) {
      console.error("[createRule] ✗ User not authenticated")
      return { success: false, error: "Not authenticated" }
    }

    console.log("[createRule] Validating input...")
    const validated = createRuleSchema.parse(input)
    console.log("[createRule] ✓ Validation passed")
    
    console.log("[createRule] Getting or creating user...")
    const user = await getOrCreateUser(userId)
    console.log("[createRule] User ID:", user.id)

    // Create rule in database
    console.log("[createRule] Creating rule in database...")
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

    console.log("[createRule] ✅ Rule created successfully:", rule.id)

    // Index rule in Pinecone
    console.log("[createRule] Indexing rule in Pinecone...")
    try {
      const embedding = await generateEmbedding(`${validated.name}\n${validated.content}`)
      const index = await getPineconeIndex()
      const pineconeId = `rule_${rule.id}`
      
      await index.upsert([
        {
          id: pineconeId,
          values: embedding,
          metadata: {
            rule_id: rule.id,
            user_id: user.id,
            name: validated.name,
            repository_id: validated.repository_id || "",
            version: rule.version,
            type: "rule",
          },
        },
      ])

      await prisma.rule.update({
        where: { id: rule.id },
        data: { pinecone_id: pineconeId },
      })
      
      console.log("[createRule] ✅ Rule indexed in Pinecone successfully")
    } catch (error) {
      console.error("[createRule] ✗ Error indexing rule in Pinecone:", error)
      // Continue even if Pinecone fails - rule is still saved in database
    }

    return { success: true, data: rule, indexing: true }
  } catch (error) {
    console.error("[createRule] ✗ Error occurred:", error)
    if (error instanceof z.ZodError) {
      console.error("[createRule] Validation errors:", error.issues)
      return { success: false, error: "Validation failed", details: error.issues }
    }
    console.error("[createRule] ✗ Failed to create rule:", error)
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

    // Index updated rule in Pinecone
    try {
      const embedding = await generateEmbedding(`${updatedName}\n${updatedContent}`)
      const index = await getPineconeIndex()
      const pineconeId = `rule_${newRule.id}`
      
      await index.upsert([
        {
          id: pineconeId,
          values: embedding,
          metadata: {
            rule_id: newRule.id,
            user_id: user.id,
            name: updatedName,
            repository_id: existingRule.repository_id || "",
            version: newVersion,
            type: "rule",
          },
        },
      ])

      await prisma.rule.update({
        where: { id: newRule.id },
        data: { pinecone_id: pineconeId },
      })
    } catch (error) {
      console.error("Error indexing updated rule in Pinecone:", error)
    }

    return { success: true, data: newRule, indexing: true }
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
  console.log("[getUserRules] Server action called")
  console.log("[getUserRules] Repository ID:", repositoryId || "none")
  
  try {
    console.log("[getUserRules] Authenticating user...")
    const { userId } = await auth()
    console.log("[getUserRules] User ID:", userId ? "✓ Found" : "✗ Not found")
    
    if (!userId) {
      console.error("[getUserRules] ✗ User not authenticated")
      return { success: false, error: "Not authenticated" }
    }

    console.log("[getUserRules] Getting or creating user...")
    const user = await getOrCreateUser(userId)
    console.log("[getUserRules] User ID:", user.id)

    console.log("[getUserRules] Fetching rules...")
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

    console.log("[getUserRules] ✅ Found", rules.length, "rules")
    return { success: true, data: rules }
  } catch (error) {
    console.error("[getUserRules] ✗ Error fetching rules:", error)
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
  console.log("[deleteRule] Server action called")
  console.log("[deleteRule] Rule ID:", ruleId)
  
  try {
    console.log("[deleteRule] Authenticating user...")
    const { userId } = await auth()
    console.log("[deleteRule] User ID:", userId ? "✓ Found" : "✗ Not found")
    
    if (!userId) {
      console.error("[deleteRule] ✗ User not authenticated")
      return { success: false, error: "Not authenticated" }
    }

    console.log("[deleteRule] Getting or creating user...")
    const user = await getOrCreateUser(userId)
    console.log("[deleteRule] User ID:", user.id)

    console.log("[deleteRule] Checking if rule exists...")
    const rule = await prisma.rule.findFirst({
      where: {
        id: ruleId,
        user_id: user.id,
      },
    })

    if (!rule) {
      console.error("[deleteRule] ✗ Rule not found")
      return { success: false, error: "Rule not found" }
    }

    // Delete from Pinecone if exists
    if (rule.pinecone_id) {
      console.log("[deleteRule] Deleting from Pinecone...")
      try {
        const index = await getPineconeIndex()
        await index.deleteOne(rule.pinecone_id)
        console.log("[deleteRule] ✅ Deleted from Pinecone")
      } catch (error) {
        console.error("[deleteRule] ✗ Error deleting from Pinecone:", error)
      }
    }

    // Delete from database
    console.log("[deleteRule] Deleting rule from database...")
    await prisma.rule.delete({
      where: { id: ruleId },
    })

    console.log("[deleteRule] ✅ Rule deleted successfully")
    return { success: true }
  } catch (error) {
    console.error("[deleteRule] ✗ Error deleting rule:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete rule" }
  }
}

/**
 * Search rules using vector similarity with Pinecone
 */
export async function searchRules(query: string, repositoryId?: string, topK: number = 5) {
  console.log("[searchRules] Server action called")
  console.log("[searchRules] Query:", query, "| Repository ID:", repositoryId || "none", "| TopK:", topK)
  
  try {
    console.log("[searchRules] Authenticating user...")
    const { userId } = await auth()
    console.log("[searchRules] User ID:", userId ? "✓ Found" : "✗ Not found")
    
    if (!userId) {
      console.error("[searchRules] ✗ User not authenticated")
      return { success: false, error: "Not authenticated" }
    }

    console.log("[searchRules] Getting or creating user...")
    const user = await getOrCreateUser(userId)
    console.log("[searchRules] User ID:", user.id)

    // Try vector search with Pinecone first
    try {
      console.log("[searchRules] Generating embedding for query...")
      const queryEmbedding = await generateEmbedding(query)
      
      console.log("[searchRules] Searching in Pinecone...")
      const index = await getPineconeIndex()
      const searchResults = await index.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
        filter: {
          user_id: user.id,
          ...(repositoryId ? { repository_id: repositoryId } : {}),
          type: "rule",
        },
      })

      const ruleIds = searchResults.matches
        .map((match) => match.metadata?.rule_id)
        .filter((id): id is string => typeof id === "string")

      if (ruleIds.length > 0) {
        console.log("[searchRules] Found", ruleIds.length, "matches in Pinecone")
        const rules = await prisma.rule.findMany({
          where: {
            id: { in: ruleIds },
            user_id: user.id,
          },
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

        const rulesWithScores = rules.map((rule) => {
          const match = searchResults.matches.find(
            (m) => m.metadata?.rule_id === rule.id
          )
          return {
            ...rule,
            relevance_score: match?.score ?? 0,
          }
        })

        rulesWithScores.sort((a, b) => b.relevance_score - a.relevance_score)
        console.log("[searchRules] ✅ Vector search completed")
        return { success: true, data: rulesWithScores }
      }
    } catch (error) {
      console.error("[searchRules] ✗ Vector search failed, falling back to text search:", error)
    }

    // Fallback to text search
    console.log("[searchRules] Using text search fallback...")
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

    console.log("[searchRules] ✅ Found", rules.length, "matching rules")
    return { success: true, data: rules }
  } catch (error) {
    console.error("[searchRules] ✗ Error searching rules:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to search rules" }
  }
}

