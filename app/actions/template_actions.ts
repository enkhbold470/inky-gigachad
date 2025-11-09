"use server"

import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  content: z.string().min(1),
  category: z.string().optional(),
  is_public: z.boolean().default(true),
})

const updateTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  content: z.string().min(1).optional(),
  category: z.string().optional(),
  is_public: z.boolean().optional(),
})

/**
 * Create a rule template
 */
export async function createTemplate(input: z.infer<typeof createTemplateSchema>) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    const validated = createTemplateSchema.parse(input)

    const template = await prisma.ruleTemplate.create({
      data: validated,
      select: {
        id: true,
        name: true,
        description: true,
        content: true,
        category: true,
        is_public: true,
        created_at: true,
      },
    })

    return { success: true, data: template }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Validation failed", details: error.issues }
    }
    console.error("Error creating template:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to create template" }
  }
}

/**
 * Get all public templates
 */
export async function getPublicTemplates(category?: string) {
  console.log("[getPublicTemplates] Server action called")
  console.log("[getPublicTemplates] Category:", category || "none")
  
  try {
    console.log("[getPublicTemplates] Fetching templates from database...")
    const templates = await prisma.ruleTemplate.findMany({
      where: {
        is_public: true,
        ...(category ? { category } : {}),
      },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        content: true,
        category: true,
        created_at: true,
      },
    })

    console.log("[getPublicTemplates] ✅ Found", templates.length, "templates")
    return { success: true, data: templates }
  } catch (error) {
    console.error("[getPublicTemplates] ✗ Error fetching templates:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch templates" }
  }
}

/**
 * Get template by ID
 */
export async function getTemplateById(templateId: string) {
  try {
    const template = await prisma.ruleTemplate.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        name: true,
        description: true,
        content: true,
        category: true,
        is_public: true,
        created_at: true,
      },
    })

    if (!template) {
      return { success: false, error: "Template not found" }
    }

    return { success: true, data: template }
  } catch (error) {
    console.error("Error fetching template:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch template" }
  }
}

/**
 * Load templates from emergent/rules directory
 */
export async function loadEmergentTemplates() {
  console.log("[loadEmergentTemplates] Server action called")
  
  try {
    // In serverless environments, we can't use fs directly
    // Templates should be loaded at build time or stored in database
    // For now, this is a placeholder that can be enhanced
    console.log("[loadEmergentTemplates] ⚠️ Placeholder implementation - returning empty array")
    return { success: true, data: [] }
  } catch (error) {
    console.error("[loadEmergentTemplates] ✗ Error loading emergent templates:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to load templates" }
  }
}

