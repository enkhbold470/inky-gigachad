"use server"

import {
  deleteRule as deleteLocalRule,
  listAllRules,
  saveRule,
  updateRuleById,
} from "@/lib/local-memory/store"
import { searchRules as searchRulesLocally } from "@/lib/local-memory/search"
import { createRuleSchema, updateRuleSchema, type CreateRuleInput, type UpdateRuleInput } from "@/lib/validations"
import { z } from "zod"

function toDashboardRule(rule: ReturnType<typeof listAllRules>[number]) {
  return {
    id: rule.id,
    name: rule.name,
    content: rule.content,
    version: 1,
    is_active: rule.is_active,
    source: rule.source ?? null,
    tags: rule.tags,
    created_at: new Date(rule.created_at),
    updated_at: new Date(rule.updated_at),
    repository: null,
    repository_id: null,
  }
}

export async function createRule(input: CreateRuleInput) {
  try {
    const validated = createRuleSchema.parse(input)
    const rule = saveRule({
      name: validated.name,
      content: validated.content,
      source: "dashboard",
      tags: validated.repository_id ? ["repository"] : [],
    })

    return {
      success: true,
      data: {
        id: rule.id,
        name: rule.name,
        content: rule.content,
        version: 1,
        created_at: new Date(rule.created_at),
      },
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Validation failed", details: error.issues }
    }
    return { success: false, error: error instanceof Error ? error.message : "Failed to create rule" }
  }
}

export async function updateRule(input: UpdateRuleInput) {
  try {
    const validated = updateRuleSchema.parse(input)
    const updated = updateRuleById(validated.id, {
      name: validated.name,
      content: validated.content,
      is_active: validated.is_active,
    })

    if (!updated) {
      return { success: false, error: "Rule not found" }
    }

    return {
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        content: updated.content,
        version: 1,
        created_at: new Date(updated.created_at),
      },
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Validation failed", details: error.issues }
    }
    return { success: false, error: error instanceof Error ? error.message : "Failed to update rule" }
  }
}

export async function getUserRulesWithRepositories() {
  try {
    const rules = listAllRules().map(toDashboardRule)
    return { success: true, data: rules }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch rules" }
  }
}

export async function getUserRules() {
  return getUserRulesWithRepositories()
}

export async function getRuleById(ruleId: string) {
  try {
    const rules = listAllRules()
    const rule = rules.find((entry) => entry.id === ruleId)
    if (!rule) {
      return { success: false, error: "Rule not found" }
    }
    return { success: true, data: toDashboardRule(rule) }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch rule" }
  }
}

export async function deleteRule(ruleId: string) {
  try {
    const deleted = deleteLocalRule(ruleId)
    if (!deleted) {
      return { success: false, error: "Rule not found" }
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete rule" }
  }
}

export async function searchRules(query: string, _repositoryId?: string, topK: number = 5) {
  try {
    const results = searchRulesLocally(listAllRules(), query, topK)
    const data = results.map((result) => ({
      ...toDashboardRule(result.item),
      relevance_score: result.score,
    }))
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to search rules" }
  }
}
