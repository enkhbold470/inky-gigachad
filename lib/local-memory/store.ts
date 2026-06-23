import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { randomUUID } from "node:crypto"
import type { LocalMemoryStore, MemoryEntry, RuleEntry } from "./types"

const STORE_VERSION = 1

function getStorePath(): string {
  const customPath = process.env.INKY_MEMORY_PATH
  if (customPath) return customPath

  const dataDir = process.env.INKY_DATA_DIR || join(homedir(), ".inky-gigachad")
  return join(dataDir, "memory.json")
}

function emptyStore(): LocalMemoryStore {
  return { version: STORE_VERSION, memories: [], rules: [] }
}

function ensureStoreDirectory(storePath: string): void {
  const dir = join(storePath, "..")
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

export function loadStore(): LocalMemoryStore {
  const storePath = getStorePath()
  if (!existsSync(storePath)) {
    return emptyStore()
  }

  try {
    const raw = readFileSync(storePath, "utf8")
    const parsed = JSON.parse(raw) as LocalMemoryStore
    return {
      version: parsed.version ?? STORE_VERSION,
      memories: parsed.memories ?? [],
      rules: parsed.rules ?? [],
    }
  } catch {
    return emptyStore()
  }
}

export function saveStore(store: LocalMemoryStore): void {
  const storePath = getStorePath()
  ensureStoreDirectory(storePath)
  writeFileSync(storePath, JSON.stringify(store, null, 2), "utf8")
}

export function getStorePathForDisplay(): string {
  return getStorePath()
}

export function saveMemory(input: {
  key: string
  content: string
  tags?: string[]
  source?: string
}): MemoryEntry {
  const store = loadStore()
  const now = new Date().toISOString()
  const existingIndex = store.memories.findIndex(
    (memory) => memory.key.toLowerCase() === input.key.toLowerCase()
  )

  if (existingIndex >= 0) {
    const updated: MemoryEntry = {
      ...store.memories[existingIndex],
      content: input.content,
      tags: input.tags ?? store.memories[existingIndex].tags,
      source: input.source ?? store.memories[existingIndex].source,
      updated_at: now,
    }
    store.memories[existingIndex] = updated
    saveStore(store)
    return updated
  }

  const created: MemoryEntry = {
    id: randomUUID(),
    key: input.key,
    content: input.content,
    tags: input.tags ?? [],
    source: input.source,
    created_at: now,
    updated_at: now,
  }
  store.memories.push(created)
  saveStore(store)
  return created
}

export function getMemoryByKey(key: string): MemoryEntry | null {
  const store = loadStore()
  return (
    store.memories.find((memory) => memory.key.toLowerCase() === key.toLowerCase()) ??
    null
  )
}

export function listMemories(): MemoryEntry[] {
  return loadStore().memories
}

export function deleteMemory(keyOrId: string): boolean {
  const store = loadStore()
  const before = store.memories.length
  store.memories = store.memories.filter(
    (memory) =>
      memory.id !== keyOrId &&
      memory.key.toLowerCase() !== keyOrId.toLowerCase()
  )
  if (store.memories.length === before) return false
  saveStore(store)
  return true
}

export function saveRule(input: {
  name: string
  content: string
  tags?: string[]
  source?: string
  is_active?: boolean
}): RuleEntry {
  const store = loadStore()
  const now = new Date().toISOString()
  const existingIndex = store.rules.findIndex(
    (rule) => rule.name.toLowerCase() === input.name.toLowerCase()
  )

  if (existingIndex >= 0) {
    const updated: RuleEntry = {
      ...store.rules[existingIndex],
      content: input.content,
      tags: input.tags ?? store.rules[existingIndex].tags,
      source: input.source ?? store.rules[existingIndex].source,
      is_active: input.is_active ?? store.rules[existingIndex].is_active,
      updated_at: now,
    }
    store.rules[existingIndex] = updated
    saveStore(store)
    return updated
  }

  const created: RuleEntry = {
    id: randomUUID(),
    name: input.name,
    content: input.content,
    tags: input.tags ?? [],
    source: input.source,
    is_active: input.is_active ?? true,
    created_at: now,
    updated_at: now,
  }
  store.rules.push(created)
  saveStore(store)
  return created
}

export function listRules(): RuleEntry[] {
  return loadStore().rules.filter((rule) => rule.is_active)
}

export function listAllRules(): RuleEntry[] {
  return loadStore().rules
}

export function getRuleById(id: string): RuleEntry | null {
  return loadStore().rules.find((rule) => rule.id === id) ?? null
}

export function updateRuleById(
  id: string,
  input: { name?: string; content?: string; is_active?: boolean; tags?: string[] }
): RuleEntry | null {
  const store = loadStore()
  const index = store.rules.findIndex((rule) => rule.id === id)
  if (index < 0) return null

  const now = new Date().toISOString()
  const updated: RuleEntry = {
    ...store.rules[index],
    ...input,
    updated_at: now,
  }
  store.rules[index] = updated
  saveStore(store)
  return updated
}

export function deleteRule(nameOrId: string): boolean {
  const store = loadStore()
  const before = store.rules.length
  store.rules = store.rules.filter(
    (rule) =>
      rule.id !== nameOrId &&
      rule.name.toLowerCase() !== nameOrId.toLowerCase()
  )
  if (store.rules.length === before) return false
  saveStore(store)
  return true
}
