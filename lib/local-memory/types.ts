export interface MemoryEntry {
  id: string
  key: string
  content: string
  tags: string[]
  source?: string
  created_at: string
  updated_at: string
}

export interface RuleEntry {
  id: string
  name: string
  content: string
  tags: string[]
  source?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LocalMemoryStore {
  version: number
  memories: MemoryEntry[]
  rules: RuleEntry[]
}

export interface SearchResult<T> {
  item: T
  score: number
}
