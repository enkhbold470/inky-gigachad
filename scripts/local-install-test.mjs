import { execSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawn } from "node:child_process"

console.log("local install test (no npm registry)")

// 1) Direct from repo
execSync("node bin/inky-gigachad.cjs help", { stdio: "inherit" })

// 2) npm pack tarball — works like publish without registry
const tarball = execSync("npm pack --silent", { encoding: "utf8" }).trim()
console.log(`packed ${tarball}`)

const dataDir = mkdtempSync(join(tmpdir(), "inky-pack-"))
const request = [
  {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "pack-test", version: "1.0.0" },
    },
  },
  { jsonrpc: "2.0", method: "notifications/initialized" },
  {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "save_memory",
      arguments: { key: "from-tarball", content: "works without npm publish" },
    },
  },
].map((r) => JSON.stringify(r)).join("\n")

const packDir = mkdtempSync(join(tmpdir(), "inky-npm-install-"))
execSync(`npm init -y`, { cwd: packDir, stdio: "ignore" })
execSync(`npm install "${join(process.cwd(), tarball)}"`, { cwd: packDir, stdio: "inherit" })

const binPath = join(packDir, "node_modules", ".bin", "inky-gigachad")
const child = spawn(binPath, ["mcp"], {
  env: { ...process.env, INKY_DATA_DIR: dataDir },
  stdio: ["pipe", "pipe", "inherit"],
})

let stdout = ""
child.stdout.on("data", (c) => {
  stdout += c.toString()
})
child.stdin.write(request + "\n")
child.stdin.end()

await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("pack test timeout")), 20000)
  child.on("close", (code) => {
    clearTimeout(timer)
    code === 0 || code === null ? resolve() : reject(new Error(`exit ${code}`))
  })
})

const saved = JSON.parse(stdout.trim().split("\n").at(-1))
const text = JSON.parse(saved.result.content[0].text)
if (text.key !== "from-tarball") {
  throw new Error("tarball mcp did not save memory")
}

const store = JSON.parse(readFileSync(join(dataDir, "memory.json"), "utf8"))
if (!store.memories.some((m) => m.key === "from-tarball")) {
  throw new Error("tarball install did not write memory.json")
}

rmSync(dataDir, { recursive: true, force: true })
rmSync(packDir, { recursive: true, force: true })
rmSync(join(process.cwd(), tarball), { force: true })

console.log("local install test passed — works without npm publish via npm pack / npx tarball")
