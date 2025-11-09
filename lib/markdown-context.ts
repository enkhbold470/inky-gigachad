import { readFileSync } from "fs"
import { join } from "path"
import { readdirSync, statSync } from "fs"
import { fetchMarkdownFilesFromRepo } from "@/lib/github"
import type { GitHubRepo } from "@/lib/github"

const MAX_FILE_SIZE = 100000 // ~100KB per file
const MAX_TOTAL_SIZE = 500000 // ~500KB total context

export interface MarkdownFileInfo {
  path: string
  relativePath: string
  size: number
}

export interface MarkdownContextResult {
  content: string
  files: MarkdownFileInfo[]
  totalFiles: number
  commands: string[]
  filesWithContent?: Array<{ path: string; content: string; size: number }>
}

/**
 * Recursively find all markdown files (.md and .mdc) in a directory
 */
function findMarkdownFiles(dir: string, fileList: string[] = []): string[] {
  try {
    const files = readdirSync(dir)

    for (const file of files) {
      const filePath = join(dir, file)
      
      try {
        const stat = statSync(filePath)

        if (stat.isDirectory()) {
          // Skip node_modules and other common directories
          if (
            !file.startsWith(".") &&
            file !== "node_modules" &&
            file !== ".next" &&
            file !== ".git"
          ) {
            // Recursively search subdirectories
            findMarkdownFiles(filePath, fileList)
          }
        } else if (file.endsWith(".md") || file.endsWith(".mdc")) {
          fileList.push(filePath)
        }
      } catch (statError) {
        // Skip files/directories we can't access
        console.warn(`Cannot access ${filePath}:`, statError)
        continue
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error)
  }

  return fileList
}

/**
 * Get markdown files metadata (for progress display)
 */
export function getMarkdownFilesInfo(): { files: MarkdownFileInfo[]; commands: string[] } {
  // Use process.cwd() which should be the project root in Next.js
  // In production, this might be different, so we ensure we're in the right place
  const projectRoot = process.cwd()
  const commands: string[] = []
  
  console.log(`[getMarkdownFilesInfo] Scanning for markdown files in: ${projectRoot}`)
  
  // Simulate Linux commands that would be used
  commands.push(`find ${projectRoot} -type f \\( -name "*.md" -o -name "*.mdc" \\) -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/.git/*"`)
  commands.push(`ls -la ${projectRoot}`)
  
  const markdownFiles = findMarkdownFiles(projectRoot)
  console.log(`[getMarkdownFilesInfo] Found ${markdownFiles.length} markdown files`)
  
  const fileInfos: MarkdownFileInfo[] = []

  for (const filePath of markdownFiles) {
    try {
      const stat = statSync(filePath)
      const relativePath = filePath.replace(projectRoot, "").replace(/^\//, "")
      
      fileInfos.push({
        path: filePath,
        relativePath,
        size: stat.size,
      })
      
      commands.push(`cat "${filePath}"`)
    } catch (error) {
      console.error(`Error reading file info ${filePath}:`, error)
    }
  }

  console.log(`[getMarkdownFilesInfo] Returning ${fileInfos.length} file infos`)
  return { files: fileInfos, commands }
}

/**
 * Read content from all markdown files in the project
 * Limits file size and total context size to prevent token limit issues
 */
export function getAllMarkdownContext(): string {
  const projectRoot = process.cwd()
  const markdownFiles = findMarkdownFiles(projectRoot)

  const contexts: string[] = []
  let totalSize = 0

  for (const filePath of markdownFiles) {
    try {
      const stat = statSync(filePath)
      
      // Skip files that are too large
      if (stat.size > MAX_FILE_SIZE) {
        console.warn(`Skipping large file: ${filePath} (${stat.size} bytes)`)
        continue
      }

      // Stop if we've reached the total size limit
      if (totalSize + stat.size > MAX_TOTAL_SIZE) {
        console.warn(`Reached total size limit, stopping at ${totalSize} bytes`)
        break
      }

      const content = readFileSync(filePath, "utf-8")
      const relativePath = filePath.replace(projectRoot, "").replace(/^\//, "")
      contexts.push(`\n--- File: ${relativePath} ---\n${content}\n`)
      totalSize += stat.size
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error)
    }
  }

  return contexts.join("\n\n")
}

/**
 * Get markdown context with metadata for progress display
 */
export function getAllMarkdownContextWithInfo(): MarkdownContextResult {
  const { files: fileInfos, commands } = getMarkdownFilesInfo()
  
  console.log(`[getAllMarkdownContextWithInfo] Processing ${fileInfos.length} markdown files`)
  
  const contexts: string[] = []
  let totalSize = 0
  const processedFiles: MarkdownFileInfo[] = []
  let skippedCount = 0

  for (const fileInfo of fileInfos) {
    try {
      // Skip files that are too large
      if (fileInfo.size > MAX_FILE_SIZE) {
        console.warn(`Skipping large file: ${fileInfo.path} (${fileInfo.size} bytes)`)
        skippedCount++
        continue
      }

      // Stop if we've reached the total size limit
      if (totalSize + fileInfo.size > MAX_TOTAL_SIZE) {
        console.warn(`Reached total size limit, stopping at ${totalSize} bytes`)
        break
      }

      const content = readFileSync(fileInfo.path, "utf-8")
      contexts.push(`\n--- File: ${fileInfo.relativePath} ---\n${content}\n`)
      totalSize += fileInfo.size
      processedFiles.push(fileInfo)
    } catch (error) {
      console.error(`Error reading file ${fileInfo.path}:`, error)
      skippedCount++
    }
  }

  const totalFiles = fileInfos.length
  console.log(`[getAllMarkdownContextWithInfo] Total files found: ${totalFiles}, Processed: ${processedFiles.length}, Skipped: ${skippedCount}`)

  return {
    content: contexts.join("\n\n"),
    files: processedFiles,
    totalFiles: totalFiles, // Return actual count of all files found, not just processed
    commands,
  }
}

/**
 * Get markdown context from GitHub repositories
 * Only scans public repositories
 */
export async function getMarkdownContextFromRepositories(
  repositories: GitHubRepo[]
): Promise<MarkdownContextResult> {
  // Filter to only public repositories
  const publicRepos = repositories.filter((repo) => !repo.private)
  
  console.log(`[getMarkdownContextFromRepositories] Processing ${publicRepos.length} public repositories`)
  
  const allFiles: MarkdownFileInfo[] = []
  const commands: string[] = []
  const contexts: string[] = []
  const filesWithContent: Array<{ path: string; content: string; size: number }> = []
  let totalSize = 0
  const processedFiles: MarkdownFileInfo[] = []
  let successCount = 0
  let errorCount = 0

  // Process each repository
  for (const repo of publicRepos) {
    const [owner, repoName] = repo.full_name.split("/")
    
    try {
      console.log(`[getMarkdownContextFromRepositories] Fetching markdown files from ${repo.full_name}`)
      
      // Add command for this repo
      commands.push(`git clone https://github.com/${repo.full_name}.git`)
      commands.push(`find ${repo.full_name} -type f \\( -name "*.md" -o -name "*.mdc" \\) -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/.git/*"`)
      
      const markdownFiles = await fetchMarkdownFilesFromRepo(owner, repoName)
      
      console.log(`[getMarkdownContextFromRepositories] Found ${markdownFiles.length} markdown files in ${repo.full_name}`)
      
      for (const file of markdownFiles) {
        const relativePath = `${repo.full_name}/${file.path}`
        
        // Skip files that are too large
        if (file.size > MAX_FILE_SIZE) {
          console.warn(`[getMarkdownContextFromRepositories] Skipping large file: ${relativePath} (${file.size} bytes)`)
          continue
        }

        // Stop if we've reached the total size limit
        if (totalSize + file.size > MAX_TOTAL_SIZE) {
          console.warn(`[getMarkdownContextFromRepositories] Reached total size limit, stopping at ${totalSize} bytes`)
          break
        }

        const fileInfo: MarkdownFileInfo = {
          path: relativePath,
          relativePath,
          size: file.size,
        }

        allFiles.push(fileInfo)
        contexts.push(`\n--- File: ${relativePath} ---\n${file.content}\n`)
        filesWithContent.push({
          path: relativePath,
          content: file.content,
          size: file.size,
        })
        totalSize += file.size
        processedFiles.push(fileInfo)
        successCount++
        
        commands.push(`cat "${relativePath}"`)
      }
    } catch (error) {
      console.error(`[getMarkdownContextFromRepositories] Error processing ${repo.full_name}:`, error)
      errorCount++
      // Continue with other repositories
    }
  }

  const totalFiles = allFiles.length
  console.log(`[getMarkdownContextFromRepositories] Total files found: ${totalFiles}, Processed: ${processedFiles.length}`)
  if (errorCount > 0) {
    console.log(`[getMarkdownContextFromRepositories] Successfully fetched ${successCount} files, ${errorCount} errors`)
  }

  return {
    content: contexts.join("\n\n"),
    files: processedFiles,
    totalFiles: totalFiles,
    commands,
    filesWithContent,
  }
}

