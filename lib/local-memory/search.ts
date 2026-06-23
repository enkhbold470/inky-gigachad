import type { MemoryEntry, RuleEntry, SearchResult } from "./types"

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1)
}

function scoreText(query: string, fields: string[]): number {
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return 0

  const haystack = fields.join(" ").toLowerCase()
  let score = 0

  for (const token of queryTokens) {
    if (haystack.includes(token)) {
      score += 1
    }
  }

  const normalizedQuery = query.toLowerCase().trim()
  if (normalizedQuery && haystack.includes(normalizedQuery)) {
    score += 3
  }

  return score
}

export function searchMemories(
  memories: MemoryEntry[],
  query: string,
  topK = 10
): SearchResult<MemoryEntry>[] {
  return memories
    .map((memory) => ({
      item: memory,
      score: scoreText(query, [memory.key, memory.content, memory.tags.join(" ")]),
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

export function searchRules(
  rules: RuleEntry[],
  query: string,
  topK = 10
): SearchResult<RuleEntry>[] {
  return rules
    .filter((rule) => rule.is_active)
    .map((rule) => ({
      item: rule,
      score: scoreText(query, [rule.name, rule.content, rule.tags.join(" ")]),
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}
