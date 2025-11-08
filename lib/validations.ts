import { z } from "zod"

export const createRuleSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  content: z.string().min(1, "Content is required"),
  repository_id: z.string().optional(),
})

export const updateRuleSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
})

export const createSessionSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  repository_id: z.string().optional(),
  context: z.string().optional(),
})

export const updateSessionSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  context: z.string().optional(),
  is_active: z.boolean().optional(),
})

export const saveRepositorySchema = z.object({
  github_id: z.number(),
  name: z.string(),
  full_name: z.string(),
  owner: z.string(),
  description: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  stars: z.number().default(0),
  is_private: z.boolean().default(false),
  html_url: z.string(),
})

export type CreateRuleInput = z.infer<typeof createRuleSchema>
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>
export type CreateSessionInput = z.infer<typeof createSessionSchema>
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>
export type SaveRepositoryInput = z.infer<typeof saveRepositorySchema>

