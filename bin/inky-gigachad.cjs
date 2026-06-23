#!/usr/bin/env node
import("../dist/mcp/cli.js").catch((error) => {
  console.error(
    `inky-gigachad failed to start: ${error instanceof Error ? error.message : String(error)}`
  )
  process.exit(1)
})
