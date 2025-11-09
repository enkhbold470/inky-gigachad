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
    const body = await req.json()
    const { method, params, id } = body

    if (!method || !id) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: "Invalid Request",
            data: "Missing method or id",
          },
          id: id || null,
        },
        { status: 400 }
      )
    }

    // Handle MCP protocol methods
    if (method === "tools/list") {
      return NextResponse.json({
        jsonrpc: "2.0",
        result: {
          tools: [
            {
              name: "list_rules",
              description: "List all user's rules, optionally filtered by repository",
              inputSchema: {
                type: "object",
                properties: {
                  repository_id: {
                    type: "string",
                    description: "Optional repository ID to filter rules",
                  },
                },
              },
            },
          ],
        },
        id,
      })
    }

    if (method === "tools/call") {
      const { name, arguments: toolArgs } = params || {}

      if (!name) {
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
                data: "Failed to list rules",
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

