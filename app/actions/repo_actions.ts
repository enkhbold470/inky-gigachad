"use server"

import { auth } from "@clerk/nextjs/server"
import type { GitHubRepo } from "@/lib/github"
import { getMarkdownContextFromRepositories } from "@/lib/markdown-context"
import { generateRulesFromRepositoryContext, indexMarkdownFilesLocally } from "@/lib/rag"
import { saveRule } from "@/lib/local-memory/store"

export async function saveRepositories(repos: GitHubRepo[]) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    const markdownContextResult = await getMarkdownContextFromRepositories(repos)
    const filesWithContent = markdownContextResult.filesWithContent || []

    const processingDetails: {
      repositories: Array<{ name: string; filesFound: number; filesProcessed: number }>
      files: Array<{ path: string; chunks?: number; status: string }>
      totalChunks?: number
      logs?: Array<{ level: string; message: string; timestamp: number }>
    } = {
      repositories: repos.map((repo) => ({
        name: repo.full_name,
        filesFound: markdownContextResult.files.filter((file) =>
          file.path.startsWith(repo.full_name)
        ).length,
        filesProcessed:
          filesWithContent.filter((file) => file.path.startsWith(repo.full_name)).length,
      })),
      files:
        filesWithContent.map((file) => ({
          path: file.path,
          status: "loaded",
        })) || [],
      logs: markdownContextResult.logs || [],
    }

    const indexingResult = await indexMarkdownFilesLocally(
      filesWithContent.filter((file) => file.content.length > 0),
      (level, message) => {
        processingDetails.logs?.push({ level, message, timestamp: Date.now() })
      }
    )

    if (indexingResult.logs) {
      processingDetails.logs = [...(processingDetails.logs || []), ...indexingResult.logs]
    }

    const repoInfo = repos.map((repo) => ({
      name: repo.name,
      full_name: repo.full_name,
      language: repo.language,
      description: repo.description,
    }))

    const ruleContent = await generateRulesFromRepositoryContext(
      repoInfo,
      filesWithContent.map((file) => ({ path: file.path, content: file.content }))
    )

    const generatedRule = saveRule({
      name: "Generated Rules from Repositories",
      content: ruleContent,
      source: "github-import",
      tags: ["generated", "github"],
    })

    return {
      success: true,
      data: {
        generatedRule,
        markdownFiles: markdownContextResult.files,
        totalMarkdownFiles: markdownContextResult.totalFiles,
        commands: markdownContextResult.commands,
        indexedChunks: indexingResult.indexed,
        failedChunks: indexingResult.failed,
        processingDetails,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save repositories",
    }
  }
}
