import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { saveMemory, saveRule } from "./store"

const RULE_FILE_NAMES = new Set([
  "agents.md",
  "claude.md",
  "cursor.md",
  "windsurf.md",
  "copilot-instructions.md",
])

function walkMarkdownFiles(dir: string, results: string[] = []): string[] {
  if (!existsSync(dir)) return results

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stats = statSync(fullPath)
    if (stats.isDirectory()) {
      walkMarkdownFiles(fullPath, results)
      continue
    }
    if (entry.endsWith(".md") || entry.endsWith(".mdc")) {
      results.push(fullPath)
    }
  }

  return results
}

function toRuleName(filePath: string): string {
  const base = filePath.split("/").pop() ?? "imported-rule"
  return base.replace(/\.(md|mdc)$/i, "")
}

export function importProjectRules(projectDir = process.cwd()): {
  imported_rules: number
  imported_memories: number
  files: string[]
} {
  const candidateDirs = [
    join(projectDir, ".cursor", "rules"),
    join(projectDir, ".inky"),
    projectDir,
  ]

  const files = new Set<string>()
  for (const dir of candidateDirs) {
    for (const file of walkMarkdownFiles(dir)) {
      files.add(file)
    }
  }

  let importedRules = 0
  let importedMemories = 0

  for (const filePath of files) {
    const content = readFileSync(filePath, "utf8").trim()
    if (!content) continue

    const fileName = filePath.split("/").pop()?.toLowerCase() ?? ""
    const relativePath = filePath.replace(`${projectDir}/`, "")

    if (RULE_FILE_NAMES.has(fileName)) {
      saveMemory({
        key: fileName.replace(/\.md$/i, ""),
        content,
        tags: ["imported", "project"],
        source: relativePath,
      })
      importedMemories += 1
      continue
    }

    saveRule({
      name: toRuleName(relativePath),
      content,
      tags: ["imported", "project"],
      source: relativePath,
    })
    importedRules += 1
  }

  return {
    imported_rules: importedRules,
    imported_memories: importedMemories,
    files: [...files].map((file) => file.replace(`${projectDir}/`, "")),
  }
}
