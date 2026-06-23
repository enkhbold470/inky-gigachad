"use server"

import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { RuleTemplate } from "@/lib/types"

function loadBuiltInTemplates(): RuleTemplate[] {
  const rulesDir = join(process.cwd(), "rules")
  const files = readdirSync(rulesDir).filter((file) => file.endsWith(".mdc") || file.endsWith(".md"))

  return files.map((file) => {
    const content = readFileSync(join(rulesDir, file), "utf8")
    const slug = file.replace(/\.(mdc|md)$/i, "")
    const name = slug
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")

    return {
      id: slug,
      name,
      description: `Built-in ${name} template`,
      content,
      category: "Built-in",
      author: "Inky",
      x_account: null,
      created_at: new Date(),
    }
  })
}

export async function getPublicTemplates(category?: string) {
  try {
    const templates = loadBuiltInTemplates().filter((template) =>
      category ? template.category === category : true
    )
    return { success: true, data: templates }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch templates",
    }
  }
}

export async function getTemplateById(templateId: string) {
  try {
    const template = loadBuiltInTemplates().find((entry) => entry.id === templateId)
    if (!template) {
      return { success: false, error: "Template not found" }
    }
    return { success: true, data: template }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch template" }
  }
}
