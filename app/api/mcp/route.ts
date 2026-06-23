import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { searchRules as searchRulesLocally } from "@/lib/local-memory/search"
import type { RuleEntry } from "@/lib/local-memory/types"

async function authenticateUser(userId: string) {
  if (!userId) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { clerk_id: userId },
    select: { id: true },
  })

  return user
}

function toRuleEntries(
  rules: Array<{
    id: string
    name: string
    content: string
    is_active: boolean
    repository_id: string | null
    created_at: Date
    updated_at: Date
  }>
): RuleEntry[] {
  return rules.map((rule) => ({
    id: rule.id,
    name: rule.name,
    content: rule.content,
    tags: rule.repository_id ? ["repository"] : [],
    source: "database",
    is_active: rule.is_active,
    created_at: rule.created_at.toISOString(),
    updated_at: rule.updated_at.toISOString(),
  }))
}

const MCP_TOOLS = [
  {
    name: "list_rules",
    description: "List all user coding rules, optionally filtered by repository",
    inputSchema: {
      type: "object",
      properties: {
        repository_id: {
          type: "string",
          description: "Optional repository ID to filter rules",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "search_rules",
    description: "Search coding rules with local text matching",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        repository_id: { type: "string", description: "Optional repository filter" },
        top_k: { type: "number", description: "Maximum results (default 5)" },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
]

export async function GET(req: Request) {
  try {
    const userId = req.headers.get("X-User-Id")

    if (!userId) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: { code: -32001, message: "Unauthorized", data: "Missing user ID" },
        },
        { status: 401 }
      )
    }

    const user = await authenticateUser(userId)
    if (!user) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: { code: -32001, message: "Unauthorized", data: "Invalid user ID" },
        },
        { status: 401 }
      )
    }

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        const pingInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`))
          } catch {
            clearInterval(pingInterval)
            controller.close()
          }
        }, 30000)

        req.signal.addEventListener("abort", () => {
          clearInterval(pingInterval)
          controller.close()
        })
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (error) {
    console.error("[MCP] SSE error:", error)
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal error" },
      },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const userId = req.headers.get("X-User-Id")

    if (!userId) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: "Unauthorized",
            data: "Missing or invalid X-User-Id header",
          },
        },
        { status: 401 }
      )
    }

    const user = await authenticateUser(userId)
    if (!user) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: { code: -32001, message: "Unauthorized", data: "Invalid user ID" },
        },
        { status: 401 }
      )
    }

    const bodyText = await req.text()
    if (!bodyText?.trim()) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: { code: -32600, message: "Invalid Request", data: "Request body is empty" },
          id: null,
        },
        { status: 400 }
      )
    }

    const body = JSON.parse(bodyText)
    const { method, params, id } = body

    if (!method) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: { code: -32600, message: "Invalid Request", data: "Missing method" },
          id: id || null,
        },
        { status: 400 }
      )
    }

    if (id === undefined && method.startsWith("notifications/")) {
      return NextResponse.json({ jsonrpc: "2.0" }, { status: 200 })
    }

    if (id === undefined) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: { code: -32600, message: "Invalid Request", data: `Missing id for ${method}` },
          id: null,
        },
        { status: 400 }
      )
    }

    if (method === "initialize") {
      return NextResponse.json({
        jsonrpc: "2.0",
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: {
            name: "inky-gigachad",
            version: "0.2.0",
          },
        },
        id,
      })
    }

    if (method === "tools/list") {
      return NextResponse.json({
        jsonrpc: "2.0",
        result: { tools: MCP_TOOLS },
        id,
      })
    }

    if (method === "tools/call") {
      const { name, arguments: toolArgs } = params || {}

      if (name === "list_rules") {
        const { repository_id } = toolArgs || {}
        const rules = await prisma.rule.findMany({
          where: {
            user_id: user.id,
            ...(repository_id ? { repository_id } : {}),
          },
          orderBy: [{ created_at: "desc" }],
          select: {
            id: true,
            name: true,
            content: true,
            version: true,
            is_active: true,
            repository_id: true,
            created_at: true,
          },
        })

        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            content: [{ type: "text", text: JSON.stringify(rules, null, 2) }],
          },
          id,
        })
      }

      if (name === "search_rules") {
        const { query, repository_id, top_k } = toolArgs || {}
        if (!query || typeof query !== "string") {
          return NextResponse.json(
            {
              jsonrpc: "2.0",
              error: { code: -32602, message: "Invalid params", data: "query is required" },
              id,
            },
            { status: 400 }
          )
        }

        const rules = await prisma.rule.findMany({
          where: {
            user_id: user.id,
            ...(repository_id ? { repository_id } : {}),
          },
          orderBy: [{ created_at: "desc" }],
          select: {
            id: true,
            name: true,
            content: true,
            version: true,
            is_active: true,
            repository_id: true,
            created_at: true,
            updated_at: true,
          },
        })

        const results = searchRulesLocally(toRuleEntries(rules), query, top_k ?? 5)
        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
          },
          id,
        })
      }

      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: { code: -32601, message: "Method not found", data: `Unknown tool: ${name}` },
          id,
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: { code: -32601, message: "Method not found", data: `Unknown method: ${method}` },
        id,
      },
      { status: 404 }
    )
  } catch (error) {
    console.error("[MCP] Unexpected error:", error)
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal error" },
        id: null,
      },
      { status: 500 }
    )
  }
}
