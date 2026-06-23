#!/usr/bin/env node
import { startMcpServer } from "./server.js"

function printHelp(): void {
  process.stdout.write(`inky-gigachad — local coding memory for MCP

Usage:
  npx -y inky-gigachad mcp          Start the local MCP server (stdio)
  npx -y inky-gigachad help         Show this help

Cursor / Claude Code / Codex config:
{
  "mcpServers": {
    "inky": {
      "command": "npx",
      "args": ["-y", "inky-gigachad", "mcp"]
    }
  }
}

Memory file: ~/.inky-gigachad/memory.json
`)
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? "help"

  if (command === "mcp") {
    await startMcpServer()
    return
  }

  if (command === "help" || command === "--help" || command === "-h") {
    printHelp()
    return
  }

  process.stderr.write(`Unknown command: ${command}\n\n`)
  printHelp()
  process.exit(1)
}

main().catch((error) => {
  process.stderr.write(
    `inky-gigachad failed: ${error instanceof Error ? error.message : String(error)}\n`
  )
  process.exit(1)
})
