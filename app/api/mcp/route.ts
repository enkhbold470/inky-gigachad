import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Authenticate user from userId header
 */
async function authenticateUser(userId: string) {
  if (!userId) {
    return null
  }

  // Find user by clerk_id
  const user = await prisma.user.findUnique({
    where: { clerk_id: userId },
    select: { id: true },
  })

  return user
}

/**
 * Handle SSE connection for MCP protocol
 * MCP over HTTP uses SSE for server-to-client messages
 */
export async function GET(req: Request) {
  try {
    // Extract userId from X-User-Id header
    const userId = req.headers.get("X-User-Id")

    if (!userId) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: "Unauthorized",
            data: "Missing user ID",
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
          error: {
            code: -32001,
            message: "Unauthorized",
            data: "Invalid user ID",
          },
        },
        { status: 401 }
      )
    }

    // Return SSE stream
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()

        // Send initial connection message
        const sendMessage = (data: unknown) => {
          const message = `data: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(message))
        }

        // Send server info
        sendMessage({
          jsonrpc: "2.0",
          method: "notifications/initialized",
          params: {},
        })

        // Keep connection alive with periodic ping
        const pingInterval = setInterval(() => {
          try {
            sendMessage({
              jsonrpc: "2.0",
              method: "ping",
              params: { timestamp: Date.now() },
            })
          } catch {
            clearInterval(pingInterval)
            controller.close()
          }
        }, 30000) // Ping every 30 seconds

        // Handle cleanup
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
        error: {
          code: -32603,
          message: "Internal error",
          data: "Failed to establish SSE connection",
        },
      },
      { status: 500 }
    )
  }
}

/**
 * MCP Protocol HTTP Endpoint
 * Handles tools/list and tools/call requests
 */
export async function POST(req: Request) {
  try {
    // Extract userId from X-User-Id header
    const userId = req.headers.get("X-User-Id")
    
    console.log("[MCP] POST request received")
    console.log("[MCP] Headers:", {
      "X-User-Id": userId,
      "Content-Type": req.headers.get("Content-Type"),
    })
    
    if (!userId) {
      console.error("[MCP] Missing X-User-Id header")
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
      console.error("[MCP] Invalid user ID:", userId)
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: "Unauthorized",
            data: "Invalid user ID",
          },
        },
        { status: 401 }
      )
    }

    // Parse JSON-RPC request
    let body
    try {
      const bodyText = await req.text()
      console.log("[MCP] Request body:", bodyText || "(empty)")
      
      if (!bodyText || bodyText.trim() === "") {
        console.error("[MCP] Empty request body")
        return NextResponse.json(
          {
            jsonrpc: "2.0",
            error: {
              code: -32600,
              message: "Invalid Request",
              data: "Request body is empty",
            },
            id: null,
          },
          { status: 400 }
        )
      }
      
      body = JSON.parse(bodyText)
    } catch (parseError) {
      console.error("[MCP] JSON parse error:", parseError)
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32700,
            message: "Parse error",
            data: parseError instanceof Error ? parseError.message : "Invalid JSON",
          },
          id: null,
        },
        { status: 400 }
      )
    }

    console.log("[MCP] Parsed body:", JSON.stringify(body, null, 2))
    const { method, params, id } = body

    // Validate method exists
    if (!method) {
      console.error("[MCP] Missing method:", body)
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: "Invalid Request",
            data: `Missing method. Received: ${JSON.stringify(body)}`,
          },
          id: id || null,
        },
        { status: 400 }
      )
    }

    // Handle notifications (no id required)
    if (id === undefined && method.startsWith("notifications/")) {
      console.log(`[MCP] Notification received: ${method}`)
      // Notifications don't require a response
      return NextResponse.json({ jsonrpc: "2.0" }, { status: 200 })
    }

    // Requests require an id
    if (id === undefined) {
      console.error("[MCP] Missing id for request:", { method, body })
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: "Invalid Request",
            data: `Missing id for request method: ${method}`,
          },
          id: null,
        },
        { status: 400 }
      )
    }

    // Handle MCP protocol methods
    if (method === "initialize") {
      console.log("[MCP] Initialize request received with params:", params)
      return NextResponse.json({
        jsonrpc: "2.0",
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
            experimental: {},
          },
          serverInfo: {
            name: "inky-mcp-server",
            version: "1.0.0",
          },
        },
        id,
      })
    }

    if (method === "tools/list") {
      console.log("[MCP] tools/list request received")
      return NextResponse.json({
        jsonrpc: "2.0",
        result: {
          tools: [
            {
              name: "list_rules",
              description: "List all user's coding rules, optionally filtered by repository",
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
          ],
        },
        id,
      })
    }

    if (method === "tools/call") {
      console.log("[MCP] tools/call request received with params:", params)
      const { name, arguments: toolArgs } = params || {}

      if (!name) {
        console.error("[MCP] Missing tool name in tools/call")
        return NextResponse.json(
          {
            jsonrpc: "2.0",
            error: {
              code: -32602,
              message: "Invalid params",
              data: "Missing tool name",
            },
            id,
          },
          { status: 400 }
        )
      }

      // Handle list_rules tool
      if (name === "list_rules") {
        const { repository_id } = toolArgs || {}
        console.log(`[MCP] Calling list_rules tool for user ${user.id}, repository_id: ${repository_id || "all"}`)

        try {
          const rules = await prisma.rule.findMany({
            where: {
              user_id: user.id,
              ...(repository_id ? { repository_id: repository_id } : {}),
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

          console.log(`[MCP] Found ${rules.length} rules`)
          return NextResponse.json({
            jsonrpc: "2.0",
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(rules, null, 2),
                },
              ],
            },
            id,
          })
        } catch (error) {
          console.error("[MCP] Error listing rules:", error)
          return NextResponse.json(
            {
              jsonrpc: "2.0",
              error: {
                code: -32603,
                message: "Internal error",
                data: error instanceof Error ? error.message : "Failed to list rules",
              },
              id,
            },
            { status: 500 }
          )
        }
      }

      // Unknown tool
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32601,
            message: "Method not found",
            data: `Unknown tool: ${name}`,
          },
          id,
        },
        { status: 404 }
      )
    }

    // Unknown method
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32601,
          message: "Method not found",
          data: `Unknown method: ${method}`,
        },
        id,
      },
      { status: 404 }
    )
  } catch (error) {
    console.error("[MCP] Unexpected error:", error)
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal error",
          data: "An unexpected error occurred",
        },
        id: null,
      },
      { status: 500 }
    )
  }
}

