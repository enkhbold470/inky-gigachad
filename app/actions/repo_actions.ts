"use server"

import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { saveRepositorySchema, type SaveRepositoryInput } from "@/lib/validations"
import type { GitHubRepo } from "@/lib/github"
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
 * Save selected repository to database
 */
export async function saveRepository(repo: GitHubRepo) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    const user = await getOrCreateUser(userId)

    const repoData: SaveRepositoryInput = {
      github_id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      owner: repo.owner.login,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count,
      is_private: repo.private,
      html_url: repo.html_url,
    }

    const validated = saveRepositorySchema.parse(repoData)

    // Check if repository already exists
    const existing = await prisma.repository.findUnique({
      where: { github_id: validated.github_id },
    })

    if (existing) {
      // Update existing repository
      const updated = await prisma.repository.update({
        where: { id: existing.id },
        data: {
          name: validated.name,
          full_name: validated.full_name,
          owner: validated.owner,
          description: validated.description,
          language: validated.language,
          stars: validated.stars,
          is_private: validated.is_private,
          html_url: validated.html_url,
          is_active: true,
        },
      })

      // Deactivate other repositories for this user
      await prisma.repository.updateMany({
        where: {
          user_id: user.id,
          id: { not: updated.id },
        },
        data: { is_active: false },
      })

      return { success: true, data: updated }
    }

    // Create new repository
    const newRepo = await prisma.repository.create({
      data: {
        user_id: user.id,
        ...validated,
        is_active: true,
      },
    })

    // Deactivate other repositories for this user
    await prisma.repository.updateMany({
      where: {
        user_id: user.id,
        id: { not: newRepo.id },
      },
      data: { is_active: false },
    })

    return { success: true, data: newRepo }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Validation failed", details: error.issues }
    }
    console.error("Error saving repository:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to save repository" }
  }
}

/**
 * Get user's saved repositories
 */
export async function getUserRepositories() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    const user = await getOrCreateUser(userId)

    const repositories = await prisma.repository.findMany({
      where: { user_id: user.id },
      orderBy: [
        { is_active: "desc" },
        { updated_at: "desc" },
      ],
      select: {
        id: true,
        github_id: true,
        name: true,
        full_name: true,
        owner: true,
        description: true,
        language: true,
        stars: true,
        is_private: true,
        html_url: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    })

    return { success: true, data: repositories }
  } catch (error) {
    console.error("Error fetching repositories:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch repositories" }
  }
}

/**
 * Get active repository for user
 */
export async function getActiveRepository() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    const user = await getOrCreateUser(userId)

    const repository = await prisma.repository.findFirst({
      where: {
        user_id: user.id,
        is_active: true,
      },
      select: {
        id: true,
        github_id: true,
        name: true,
        full_name: true,
        owner: true,
        description: true,
        language: true,
        stars: true,
        is_private: true,
        html_url: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    })

    return { success: true, data: repository }
  } catch (error) {
    console.error("Error fetching active repository:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch active repository" }
  }
}

