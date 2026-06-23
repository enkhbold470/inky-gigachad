import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import * as z from "zod"
import { importProjectRules } from "../lib/local-memory/import.js"
import { searchMemories, searchRules } from "../lib/local-memory/search.js"
import {
  deleteMemory,
  deleteRule,
  getMemoryByKey,
  getStorePathForDisplay,
  listMemories,
  listRules,
  saveMemory,
  saveRule,
} from "../lib/local-memory/store.js"

function asJsonText(value: unknown) {
  return JSON.stringify(value, null, 2)
}

export async function startMcpServer(): Promise<void> {
  const server = new McpServer(
    {
      name: "inky-gigachad",
      version: "0.3.0",
    },
    {
      instructions:
        "Inky stores local coding memory and rules in ~/.inky-gigachad/memory.json. Use save_memory and save_rule to persist preferences across Cursor, Claude Code, Codex, and Windsurf.",
    }
  )

  server.registerTool(
    "save_memory",
    {
      description:
        "Save or update a durable memory entry that syncs across AI coding tools.",
      inputSchema: {
        key: z.string().describe("Stable memory key, e.g. coding-style"),
        content: z.string().describe("Memory content"),
        tags: z.array(z.string()).optional().describe("Optional tags"),
      },
    },
    async ({ key, content, tags }) => {
      const memory = saveMemory({ key, content, tags, source: "mcp" })
      return {
        content: [{ type: "text", text: asJsonText(memory) }],
      }
    }
  )

  server.registerTool(
    "get_memory",
    {
      description: "Get a memory entry by key.",
      inputSchema: {
        key: z.string().describe("Memory key"),
      },
    },
    async ({ key }) => {
      const memory = getMemoryByKey(key)
      return {
        content: [{ type: "text", text: asJsonText(memory) }],
      }
    }
  )

  server.registerTool(
    "list_memories",
    {
      description: "List all saved memory entries.",
      inputSchema: {},
    },
    async () => {
      return {
        content: [{ type: "text", text: asJsonText(listMemories()) }],
      }
    }
  )

  server.registerTool(
    "search_memories",
    {
      description: "Search saved memories with local text matching.",
      inputSchema: {
        query: z.string().describe("Search query"),
        top_k: z.number().int().min(1).max(50).optional(),
      },
    },
    async ({ query, top_k }) => {
      const results = searchMemories(listMemories(), query, top_k ?? 10)
      return {
        content: [{ type: "text", text: asJsonText(results) }],
      }
    }
  )

  server.registerTool(
    "delete_memory",
    {
      description: "Delete a memory by key or id.",
      inputSchema: {
        key_or_id: z.string(),
      },
    },
    async ({ key_or_id }) => {
      const deleted = deleteMemory(key_or_id)
      return {
        content: [{ type: "text", text: asJsonText({ deleted }) }],
      }
    }
  )

  server.registerTool(
    "save_rule",
    {
      description: "Save or update a coding rule for your AI assistants.",
      inputSchema: {
        name: z.string(),
        content: z.string(),
        tags: z.array(z.string()).optional(),
      },
    },
    async ({ name, content, tags }) => {
      const rule = saveRule({ name, content, tags, source: "mcp" })
      return {
        content: [{ type: "text", text: asJsonText(rule) }],
      }
    }
  )

  server.registerTool(
    "list_rules",
    {
      description: "List active coding rules.",
      inputSchema: {},
    },
    async () => {
      return {
        content: [{ type: "text", text: asJsonText(listRules()) }],
      }
    }
  )

  server.registerTool(
    "search_rules",
    {
      description: "Search coding rules with local text matching.",
      inputSchema: {
        query: z.string(),
        top_k: z.number().int().min(1).max(50).optional(),
      },
    },
    async ({ query, top_k }) => {
      const results = searchRules(listRules(), query, top_k ?? 10)
      return {
        content: [{ type: "text", text: asJsonText(results) }],
      }
    }
  )

  server.registerTool(
    "delete_rule",
    {
      description: "Delete a coding rule by name or id.",
      inputSchema: {
        name_or_id: z.string(),
      },
    },
    async ({ name_or_id }) => {
      const deleted = deleteRule(name_or_id)
      return {
        content: [{ type: "text", text: asJsonText({ deleted }) }],
      }
    }
  )

  server.registerTool(
    "import_project_rules",
    {
      description:
        "Import AGENTS.md, CLAUDE.md, and .cursor/rules into local Inky memory.",
      inputSchema: {
        project_dir: z.string().optional(),
      },
    },
    async ({ project_dir }) => {
      const result = importProjectRules(project_dir)
      return {
        content: [{ type: "text", text: asJsonText(result) }],
      }
    }
  )

  server.registerTool(
    "memory_store_info",
    {
      description: "Show where Inky stores local memory on disk.",
      inputSchema: {},
    },
    async () => {
      return {
        content: [
          {
            type: "text",
            text: asJsonText({
              store_path: getStorePathForDisplay(),
              env: {
                INKY_DATA_DIR: process.env.INKY_DATA_DIR ?? null,
                INKY_MEMORY_PATH: process.env.INKY_MEMORY_PATH ?? null,
              },
            }),
          },
        ],
      }
    }
  )

  const transport = new StdioServerTransport()
  await server.connect(transport)
}
