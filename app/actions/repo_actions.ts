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
  console.log("[saveRepository] Server action called")
  console.log("[saveRepository] Repository data:", { id: repo.id, name: repo.name, full_name: repo.full_name })
  
  try {
    console.log("[saveRepository] Authenticating user...")
    const { userId } = await auth()
    console.log("[saveRepository] User ID:", userId ? "✓ Found" : "✗ Not found")

    if (!userId) {
      console.error("[saveRepository] ✗ User not authenticated")
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

    console.log("[saveRepository] Validating repository data...")
    const validated = saveRepositorySchema.parse(repoData)
    console.log("[saveRepository] ✓ Validation passed")

    // Check if repository already exists
    console.log("[saveRepository] Checking for existing repository...")
    const existing = await prisma.repository.findUnique({
      where: { github_id: validated.github_id },
    })
    console.log("[saveRepository] Existing repository:", existing ? "✓ Found" : "✗ Not found")

    if (existing) {
      console.log("[saveRepository] Updating existing repository...")
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
      console.log("[saveRepository] Deactivating other repositories...")
      await prisma.repository.updateMany({
        where: {
          user_id: user.id,
          id: { not: updated.id },
        },
        data: { is_active: false },
      })

      console.log("[saveRepository] ✅ Repository updated successfully")
      return { success: true, data: updated }
    }

    // Create new repository
    console.log("[saveRepository] Creating new repository...")
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

    console.log("[saveRepository] ✅ Repository created successfully")
    return { success: true, data: newRepo }
  } catch (error) {
    console.error("[saveRepository] ✗ Error occurred:", error)
    if (error instanceof z.ZodError) {
      console.error("[saveRepository] Validation errors:", error.issues)
      return { success: false, error: "Validation failed", details: error.issues }
    }
    console.error("[saveRepository] ✗ Failed to save repository:", error)
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
  console.log("[getActiveRepository] Server action called")
  
  try {
    console.log("[getActiveRepository] Authenticating user...")
    const { userId } = await auth()
    console.log("[getActiveRepository] User ID:", userId ? "✓ Found" : "✗ Not found")

    if (!userId) {
      console.error("[getActiveRepository] ✗ User not authenticated")
      return { success: false, error: "Not authenticated" }
    }

    console.log("[getActiveRepository] Getting or creating user...")
    const user = await getOrCreateUser(userId)
    console.log("[getActiveRepository] User ID:", user.id)

    console.log("[getActiveRepository] Fetching active repository...")
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

    console.log("[getActiveRepository] Repository:", repository ? `✓ Found: ${repository.full_name}` : "✗ Not found")
    console.log("[getActiveRepository] ✅ Success")
    return { success: true, data: repository }
  } catch (error) {
    console.error("[getActiveRepository] ✗ Error fetching active repository:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch active repository" }
  }
}

