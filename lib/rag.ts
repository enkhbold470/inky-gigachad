import type { MarkdownFileInfo } from "@/lib/markdown-context"
import { generateRulesFromMarkdown } from "@/lib/local-memory/rules"

/**
 * Local-only rule generation from markdown context.
 * No AI or vector database required.
 */
export async function generateRulesFromRepositoryContext(
  repos: Array<{
    name: string
    full_name: string
    language?: string | null
    description?: string | null
  }>,
  markdownFiles: Array<{ path: string; content: string }>
): Promise<string> {
  return generateRulesFromMarkdown(repos, markdownFiles)
}

export async function indexMarkdownFilesLocally(
  files: Array<{ path: string; content: string; size: number }>,
  onLog?: (level: string, message: string) => void
): Promise<{ indexed: number; failed: number; logs: Array<{ level: string; message: string; timestamp: number }> }> {
  const logs: Array<{ level: string; message: string; timestamp: number }> = []
  const addLog = (level: string, message: string) => {
    logs.push({ level, message, timestamp: Date.now() })
    onLog?.(level, message)
  }

  let indexed = 0
  let failed = 0

  for (const file of files) {
    if (!file.content?.trim()) {
      failed += 1
      addLog("warn", `Skipped empty file ${file.path}`)
      continue
    }
    indexed += 1
    addLog("info", `Indexed markdown file ${file.path}`)
  }

  addLog("info", `Local indexing complete: ${indexed} files`)
  return { indexed, failed, logs }
}

export type { MarkdownFileInfo }
