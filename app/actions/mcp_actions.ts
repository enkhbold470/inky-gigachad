"use server"

export async function getMCPConfig() {
  return {
    success: true,
    data: {
      stdioConfig: {
        mcpServers: {
          inky: {
            command: "npx",
            args: ["-y", "inky-gigachad", "mcp"],
          },
        },
      },
      memoryPath: "~/.inky-gigachad/memory.json",
    },
  }
}
