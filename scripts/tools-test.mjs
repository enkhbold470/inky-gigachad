import { spawn } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

function parseJsonLines(stdout) {
  return stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
}

function callTool(id, name, args = {}) {
  return {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: { name, arguments: args },
  }
}

async function runMcpSession({ dataDir, fixtureDir, requests }) {
  const child = spawn("node", ["bin/inky-gigachad.cjs", "mcp"], {
    env: {
      ...process.env,
      INKY_DATA_DIR: dataDir,
      ...(fixtureDir ? { FIXTURE_DIR: fixtureDir } : {}),
    },
    stdio: ["pipe", "pipe", "pipe"],
  })

  let stdout = ""
  let stderr = ""
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString()
  })
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString()
  })

  child.stdin.write(requests.map((r) => JSON.stringify(r)).join("\n") + "\n")
  child.stdin.end()

  const exitCode = await new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill()
      resolve(1)
    }, 15000)
    child.on("close", (code) => {
      clearTimeout(timer)
      resolve(code ?? 1)
    })
  })

  return { messages: parseJsonLines(stdout), stderr, exitCode }
}

function toolText(messages, id) {
  const msg = messages.find((m) => m.id === id)
  if (!msg?.result?.content?.[0]?.text) return null
  return JSON.parse(msg.result.content[0].text)
}

function assert(condition, label) {
  if (!condition) throw new Error(`FAIL: ${label}`)
  console.log(`  ok ${label}`)
}

export async function runToolsTest() {
  const dataDir = mkdtempSync(join(tmpdir(), "inky-tools-"))
  const fixtureDir = mkdtempSync(join(tmpdir(), "inky-fixture-"))

  mkdirSync(join(fixtureDir, ".cursor", "rules"), { recursive: true })
  writeFileSync(
    join(fixtureDir, "AGENTS.md"),
    "# Agents\n\n- prefer functional React components\n- use pnpm\n"
  )
  writeFileSync(
    join(fixtureDir, "CLAUDE.md"),
    "# Claude\n\n- always run tests before commit\n"
  )
  writeFileSync(
    join(fixtureDir, ".cursor", "rules", "typescript.mdc"),
    "---\nalwaysApply: true\n---\nUse strict TypeScript.\n"
  )

  let id = 1
  const nextId = () => id++

  const requests = [
    {
      jsonrpc: "2.0",
      id: nextId(),
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "tools-test", version: "1.0.0" },
      },
    },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { jsonrpc: "2.0", id: nextId(), method: "tools/list" },
    callTool(nextId(), "memory_store_info"),
    callTool(nextId(), "save_memory", {
      key: "coding-style",
      content: "prefer functional components and pnpm",
      tags: ["typescript", "react"],
    }),
    callTool(nextId(), "get_memory", { key: "coding-style" }),
    callTool(nextId(), "list_memories"),
    callTool(nextId(), "search_memories", { query: "functional pnpm", top_k: 5 }),
    callTool(nextId(), "save_rule", {
      name: "typescript-strict",
      content: "Enable strict mode in tsconfig",
      tags: ["typescript"],
    }),
    callTool(nextId(), "list_rules"),
    callTool(nextId(), "search_rules", { query: "strict typescript", top_k: 5 }),
    callTool(nextId(), "import_project_rules", { project_dir: fixtureDir }),
    callTool(nextId(), "list_memories"),
    callTool(nextId(), "list_rules"),
    callTool(nextId(), "delete_memory", { key_or_id: "coding-style" }),
    callTool(nextId(), "delete_rule", { name_or_id: "typescript-strict" }),
  ]

  const ids = {
    init: 1,
    tools: 2,
    storeInfo: 3,
    saveMemory: 4,
    getMemory: 5,
    listMemories: 6,
    searchMemories: 7,
    saveRule: 8,
    listRules: 9,
    searchRules: 10,
    importRules: 11,
    listMemoriesAfterImport: 12,
    listRulesAfterImport: 13,
    deleteMemory: 14,
    deleteRule: 15,
  }

  console.log("human-like MCP tools test")
  const { messages, stderr, exitCode } = await runMcpSession({ dataDir, fixtureDir, requests })

  if (stderr.trim()) {
    console.log("stderr:", stderr.trim())
  }

  const init = messages.find((m) => m.id === ids.init)
  assert(init?.result?.serverInfo?.name === "inky-gigachad", "initialize returns inky-gigachad")

  const tools = messages.find((m) => m.id === ids.tools)
  const toolNames = (tools?.result?.tools ?? []).map((t) => t.name).sort()
  const expected = [
    "delete_memory",
    "delete_rule",
    "get_memory",
    "import_project_rules",
    "list_memories",
    "list_rules",
    "memory_store_info",
    "save_memory",
    "save_rule",
    "search_memories",
    "search_rules",
  ]
  assert(
    JSON.stringify(toolNames) === JSON.stringify(expected),
    `tools/list exposes all 11 tools (${toolNames.join(", ")})`
  )

  const storeInfo = toolText(messages, ids.storeInfo)
  assert(storeInfo?.store_path?.includes("memory.json"), "memory_store_info returns store path")

  const savedMemory = toolText(messages, ids.saveMemory)
  assert(savedMemory?.key === "coding-style", "save_memory persists coding-style")

  const gotMemory = toolText(messages, ids.getMemory)
  assert(gotMemory?.content?.includes("functional"), "get_memory reads saved content")

  const memories = toolText(messages, ids.listMemories)
  assert(Array.isArray(memories) && memories.length >= 1, "list_memories returns entries")

  const memorySearch = toolText(messages, ids.searchMemories)
  assert(
    Array.isArray(memorySearch) && memorySearch[0]?.item?.key === "coding-style",
    "search_memories finds functional pnpm memory"
  )

  const savedRule = toolText(messages, ids.saveRule)
  assert(savedRule?.name === "typescript-strict", "save_rule persists rule")

  const rules = toolText(messages, ids.listRules)
  assert(rules.some((r) => r.name === "typescript-strict"), "list_rules includes saved rule")

  const ruleSearch = toolText(messages, ids.searchRules)
  assert(
    ruleSearch.some((r) => r.item?.name === "typescript-strict"),
    "search_rules finds strict typescript rule"
  )

  const imported = toolText(messages, ids.importRules)
  assert(imported?.imported_memories >= 2, "import_project_rules imports AGENTS.md + CLAUDE.md")
  assert(imported?.imported_rules >= 1, "import_project_rules imports .cursor/rules")

  const memoriesAfterImport = toolText(messages, ids.listMemoriesAfterImport)
  assert(
    memoriesAfterImport.some((m) => m.key === "agents"),
    "imported agents memory is listable"
  )

  const rulesAfterImport = toolText(messages, ids.listRulesAfterImport)
  assert(
    rulesAfterImport.some((r) => r.name === "typescript"),
    "imported cursor rule is listable"
  )

  const deletedMemory = toolText(messages, ids.deleteMemory)
  assert(deletedMemory?.deleted === true, "delete_memory removes coding-style")

  const deletedRule = toolText(messages, ids.deleteRule)
  assert(deletedRule?.deleted === true, "delete_rule removes typescript-strict")

  const store = JSON.parse(readFileSync(join(dataDir, "memory.json"), "utf8"))
  assert(
    !store.memories.some((m) => m.key === "coding-style"),
    "memory.json no longer contains deleted memory"
  )
  assert(
    !store.rules.some((r) => r.name === "typescript-strict"),
    "memory.json no longer contains deleted rule"
  )
  assert(
    store.memories.some((m) => m.key === "agents"),
    "memory.json still has imported agents memory"
  )

  rmSync(dataDir, { recursive: true, force: true })
  rmSync(fixtureDir, { recursive: true, force: true })

  console.log("all tools test passed")
  return exitCode
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  runToolsTest().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
