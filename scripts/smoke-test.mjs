import { spawn } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const dataDir = mkdtempSync(join(tmpdir(), "inky-smoke-"))
const requests = [
  {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "smoke-test", version: "1.0.0" },
    },
  },
  { jsonrpc: "2.0", method: "notifications/initialized" },
  { jsonrpc: "2.0", id: 2, method: "tools/list" },
  {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "save_memory",
      arguments: { key: "smoke", content: "ok" },
    },
  },
  {
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "get_memory",
      arguments: { key: "smoke" },
    },
  },
]

const child = spawn("node", ["bin/inky-gigachad.cjs", "mcp"], {
  env: { ...process.env, INKY_DATA_DIR: dataDir },
  stdio: ["pipe", "pipe", "inherit"],
})

let stdout = ""
child.stdout.on("data", (chunk) => {
  stdout += chunk.toString()
})

child.stdin.write(requests.map((r) => JSON.stringify(r)).join("\n") + "\n")
child.stdin.end()

const exitCode = await new Promise((resolve) => {
  const timer = setTimeout(() => {
    child.kill()
    resolve(1)
  }, 10000)
  child.on("close", (code) => {
    clearTimeout(timer)
    resolve(code ?? 1)
  })
})

const lines = stdout.trim().split("\n").filter(Boolean)
const parsed = lines.map((line) => JSON.parse(line))

const init = parsed.find((msg) => msg.id === 1)
const tools = parsed.find((msg) => msg.id === 2)
const saved = parsed.find((msg) => msg.id === 3)
const fetched = parsed.find((msg) => msg.id === 4)
const store = JSON.parse(readFileSync(join(dataDir, "memory.json"), "utf8"))

rmSync(dataDir, { recursive: true, force: true })

const checks = [
  init?.result?.serverInfo?.name === "inky-gigachad",
  (tools?.result?.tools?.length ?? 0) >= 10,
  saved?.result?.content?.[0]?.text?.includes("smoke"),
  fetched?.result?.content?.[0]?.text?.includes("ok"),
  store.memories.some((m) => m.key === "smoke"),
]

if (checks.every(Boolean)) {
  console.log("smoke test passed")
  process.exit(0)
}

console.error("smoke test failed", { checks, exitCode, parsed })
process.exit(1)
