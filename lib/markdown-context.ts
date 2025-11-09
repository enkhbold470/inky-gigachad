import { readFileSync } from "fs"
import { join } from "path"
import { readdirSync, statSync } from "fs"

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
}

/**
 * Recursively find all markdown files (.md and .mdc) in a directory
 */
function findMarkdownFiles(dir: string, fileList: string[] = []): string[] {
  try {
    const files = readdirSync(dir)

    for (const file of files) {
      const filePath = join(dir, file)
      const stat = statSync(filePath)

      if (stat.isDirectory()) {
        // Skip node_modules and other common directories
        if (
          !file.startsWith(".") &&
          file !== "node_modules" &&
          file !== ".next" &&
          file !== ".git"
        ) {
          findMarkdownFiles(filePath, fileList)
        }
      } else if (file.endsWith(".md") || file.endsWith(".mdc")) {
        fileList.push(filePath)
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
  const projectRoot = process.cwd()
  const commands: string[] = []
  
  // Simulate Linux commands that would be used
  commands.push(`find ${projectRoot} -type f \\( -name "*.md" -o -name "*.mdc" \\) -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/.git/*"`)
  commands.push(`ls -la ${projectRoot}`)
  
  const markdownFiles = findMarkdownFiles(projectRoot)
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
  const projectRoot = process.cwd()
  const { files: fileInfos, commands } = getMarkdownFilesInfo()
  
  const contexts: string[] = []
  let totalSize = 0
  const processedFiles: MarkdownFileInfo[] = []

  for (const fileInfo of fileInfos) {
    try {
      // Skip files that are too large
      if (fileInfo.size > MAX_FILE_SIZE) {
        console.warn(`Skipping large file: ${fileInfo.path} (${fileInfo.size} bytes)`)
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
    }
  }

  return {
    content: contexts.join("\n\n"),
    files: processedFiles,
    totalFiles: fileInfos.length,
    commands,
  }
}

