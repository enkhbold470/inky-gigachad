"use server"

import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { createRuleSchema, updateRuleSchema, type CreateRuleInput, type UpdateRuleInput } from "@/lib/validations"
import { searchRules as searchRulesLocally } from "@/lib/local-memory/search"
import type { RuleEntry } from "@/lib/local-memory/types"
import { z } from "zod"

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

function toRuleEntries(
  rules: Array<{
    id: string
    name: string
    content: string
    version: number
    is_active: boolean
    repository_id: string | null
    created_at: Date
    updated_at: Date
  }>
): RuleEntry[] {
  return rules.map((rule) => ({
    id: rule.id,
    name: rule.name,
    content: rule.content,
    tags: rule.repository_id ? ["repository"] : [],
    source: "database",
    is_active: rule.is_active,
    created_at: rule.created_at.toISOString(),
    updated_at: rule.updated_at.toISOString(),
  }))
}

export async function createRule(input: CreateRuleInput) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    const validated = createRuleSchema.parse(input)
    const user = await getOrCreateUser(userId)

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
    return { success: false, error: error instanceof Error ? error.message : "Failed to create rule" }
  }
}

export async function updateRule(input: UpdateRuleInput) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    const validated = updateRuleSchema.parse(input)
    const user = await getOrCreateUser(userId)

    const existingRule = await prisma.rule.findFirst({
      where: {
        id: validated.id,
        user_id: user.id,
      },
    })

    if (!existingRule) {
      return { success: false, error: "Rule not found" }
    }

    const newVersion = existingRule.version + 1
    const updatedName = validated.name ?? existingRule.name
    const updatedContent = validated.content ?? existingRule.content

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
    return { success: false, error: error instanceof Error ? error.message : "Failed to update rule" }
  }
}

export async function getUserRulesWithRepositories() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    const user = await getOrCreateUser(userId)

    const rules = await prisma.rule.findMany({
      where: { user_id: user.id },
      orderBy: [{ created_at: "desc" }],
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

    const repositoryIds = rules
      .map((rule) => rule.repository_id)
      .filter((id): id is string => id !== null)

    const repositories = await prisma.repository.findMany({
      where: {
        id: { in: repositoryIds },
        user_id: user.id,
      },
      select: {
        id: true,
        name: true,
        full_name: true,
        owner: true,
        language: true,
        html_url: true,
      },
    })

    const repoMap = new Map(repositories.map((repo) => [repo.id, repo]))
    const rulesWithRepos = rules.map((rule) => ({
      ...rule,
      repository: rule.repository_id ? repoMap.get(rule.repository_id) || null : null,
    }))

    return { success: true, data: rulesWithRepos }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch rules" }
  }
}

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
      orderBy: [{ created_at: "desc" }],
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
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch rules" }
  }
}

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
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch rule" }
  }
}

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

    await prisma.rule.delete({
      where: { id: ruleId },
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete rule" }
  }
}

export async function searchRules(query: string, repositoryId?: string, topK: number = 5) {
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
      orderBy: { created_at: "desc" },
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

    const localResults = searchRulesLocally(toRuleEntries(rules), query, topK)
    const data = localResults.map((result) => ({
      id: result.item.id,
      name: result.item.name,
      content: result.item.content,
      version: rules.find((rule) => rule.id === result.item.id)?.version ?? 1,
      is_active: result.item.is_active,
      repository_id: rules.find((rule) => rule.id === result.item.id)?.repository_id ?? null,
      created_at: rules.find((rule) => rule.id === result.item.id)?.created_at ?? new Date(),
      relevance_score: result.score,
    }))

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to search rules" }
  }
}
