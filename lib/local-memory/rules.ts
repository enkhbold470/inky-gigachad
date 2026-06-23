interface MarkdownFile {
  path: string
  content: string
}

interface RepoInfo {
  name: string
  full_name: string
  language?: string | null
  description?: string | null
}

function extractHighlights(content: string, maxLines = 8): string[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("```"))
    .slice(0, maxLines)
}

export function generateRulesFromMarkdown(
  repos: RepoInfo[],
  markdownFiles: MarkdownFile[]
): string {
  const languages = [...new Set(repos.map((repo) => repo.language).filter(Boolean))]
  const repoNames = repos.map((repo) => repo.full_name).join(", ")

  const docSections = markdownFiles.slice(0, 12).map((file) => {
    const highlights = extractHighlights(file.content)
    if (highlights.length === 0) return null
    return `### ${file.path}\n${highlights.map((line) => `- ${line}`).join("\n")}`
  }).filter((section): section is string => section !== null)

  const languageLine =
    languages.length > 0
      ? `Primary languages: ${languages.join(", ")}`
      : "Primary languages: TypeScript"

  return [
    "# Generated Coding Rules",
    "",
    `Repositories: ${repoNames || "local project"}`,
    languageLine,
    "",
    "## Core Guidelines",
    "- Keep code style consistent across Cursor, Claude Code, Codex, and Windsurf.",
    "- Prefer small, focused changes with clear naming and predictable structure.",
    "- Document non-obvious business logic and validate inputs at boundaries.",
    "- Add tests for behavior that is easy to regress.",
    "",
    "## Repository Signals",
    ...repos.map((repo) => {
      const description = repo.description ? ` — ${repo.description}` : ""
      return `- ${repo.full_name}${description}`
    }),
    "",
    docSections.length > 0 ? "## Documentation Highlights" : "",
    ...docSections,
    "",
    "## Local Memory",
    "- Save durable preferences with the `save_memory` MCP tool.",
    "- Reuse them across tools via `~/.inky-gigachad/memory.json`.",
  ]
    .filter((line) => line !== "")
    .join("\n")
}
