"use server"

import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { saveRepositorySchema, type SaveRepositoryInput } from "@/lib/validations"
import type { GitHubRepo } from "@/lib/github"
import { z } from "zod"
import OpenAI from "openai"
import { getAllMarkdownContext, getAllMarkdownContextWithInfo, getMarkdownContextFromRepositories } from "@/lib/markdown-context"
import { indexMarkdownFilesToPinecone, generateRulesWithRAG } from "@/lib/rag"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
      return { success: false, error: error.issues.map((i) => i.message).join(", ") }
    }
    return { success: false, error: error instanceof Error ? error.message : "Failed to save repository" }
  }
}

/**
 * Save multiple repositories and generate rules based on them
 */
export async function saveRepositories(repos: GitHubRepo[]) {
  console.log("[saveRepositories] Server action called")
  console.log("[saveRepositories] Repositories count:", repos.length)
  
  try {
    const { userId } = await auth()

    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    const user = await getOrCreateUser(userId)

    // Save all repositories
    const savedRepos = []
    for (const repo of repos) {
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

      const existing = await prisma.repository.findUnique({
        where: { github_id: validated.github_id },
      })

      if (existing) {
        const updated = await prisma.repository.update({
          where: { id: existing.id },
          data: {
            ...validated,
            is_active: true,
          },
        })
        savedRepos.push(updated)
      } else {
        const newRepo = await prisma.repository.create({
          data: {
            user_id: user.id,
            ...validated,
            is_active: true,
          },
        })
        savedRepos.push(newRepo)
      }
    }

    // Deactivate repositories not in the selected list
    const savedRepoIds = savedRepos.map((r) => r.id)
    await prisma.repository.updateMany({
      where: {
        user_id: user.id,
        id: { notIn: savedRepoIds },
      },
      data: { is_active: false },
    })

    // Step 1: Get markdown files from selected repositories (public only)
    console.log("[saveRepositories] Loading markdown files from selected repositories...")
    const markdownContextResult = await getMarkdownContextFromRepositories(repos)
    console.log("[saveRepositories] ✓ Loaded markdown files")
    console.log("[saveRepositories] Found", markdownContextResult.totalFiles, "markdown files from public repositories")

    // Step 2: Index markdown files to Pinecone
    console.log("[saveRepositories] Indexing markdown files to Pinecone...")
    const repositoryIds = savedRepos.map((r) => r.id)
    const filesWithContent = markdownContextResult.filesWithContent || []

    const indexingResult = await indexMarkdownFilesToPinecone(
      filesWithContent.filter(f => f.content.length > 0),
      user.id,
      repositoryIds
    )
    console.log("[saveRepositories] ✅ Indexed", indexingResult.indexed, "chunks to Pinecone")
    if (indexingResult.failed > 0) {
      console.warn("[saveRepositories] ⚠️ Failed to index", indexingResult.failed, "chunks")
    }

    // Step 3: Generate rules using RAG
    const languages = savedRepos
      .map((r) => r.language)
      .filter((l): l is string => l !== null && l !== undefined)
    const uniqueLanguages = [...new Set(languages)]

    const repoInfo = savedRepos.map((r) => ({
      name: r.name,
      full_name: r.full_name,
      language: r.language,
      description: r.description,
    }))

    console.log("[saveRepositories] Generating rules using RAG...")
    try {
      const query = `Generate comprehensive coding rules based on these repositories: ${repoInfo.map(r => r.full_name).join(", ")}. Primary languages: ${uniqueLanguages.join(", ")}.`
      
      const ruleContent = await generateRulesWithRAG(
        query,
        user.id,
        repositoryIds
      )

      if (!ruleContent) {
        throw new Error("No response from RAG")
      }

      console.log("[saveRepositories] ✅ Rules generated successfully using RAG")

      // Create generated rule
      const generatedRule = await prisma.rule.create({
        data: {
          user_id: user.id,
          name: "Generated Rules from Repositories",
          content: ruleContent,
          version: 1,
        },
      })

      console.log("[saveRepositories] ✅ Repositories and rule saved successfully")
      return { 
        success: true, 
        data: { 
          repositories: savedRepos, 
          generatedRule,
          markdownFiles: markdownContextResult.files,
          totalMarkdownFiles: markdownContextResult.totalFiles,
          commands: markdownContextResult.commands,
          indexedChunks: indexingResult.indexed,
          failedChunks: indexingResult.failed,
        } 
      }
    } catch (aiError) {
      console.error("[saveRepositories] ✗ AI generation failed, falling back to simple rule:", aiError)
      
      // Fallback to simple rule generation
      const ruleContent = `Based on your selected repositories, here are your coding preferences:

Primary Languages: ${uniqueLanguages.join(", ")}

Guidelines:
- Use ${uniqueLanguages[0] || "TypeScript"} for all new files
- Follow consistent code style across all repositories
- Maintain clean architecture and separation of concerns
- Write comprehensive tests for critical functionality
- Document complex logic and APIs
- Use modern best practices for ${uniqueLanguages.join(" and ")}

This rule was automatically generated based on your repository selection.`

      const generatedRule = await prisma.rule.create({
        data: {
          user_id: user.id,
          name: "Generated Rules from Repositories",
          content: ruleContent,
          version: 1,
        },
      })

      console.log("[saveRepositories] ✅ Repositories and rule saved successfully (fallback)")
      return { 
        success: true, 
        data: { 
          repositories: savedRepos, 
          generatedRule,
          markdownFiles: markdownContextResult.files,
          totalMarkdownFiles: markdownContextResult.totalFiles,
          commands: markdownContextResult.commands,
        } 
      }
    }
  } catch (error) {
    console.error("[saveRepositories] ✗ Error occurred:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to save repositories" }
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

    console.log("[getActiveRepository] Active repository:", repository ? "✓ Found" : "✗ Not found")
    return { success: true, data: repository }
  } catch (error) {
    console.error("[getActiveRepository] ✗ Error occurred:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch active repository" }
  }
}
