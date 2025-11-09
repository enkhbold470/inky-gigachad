import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashToken } from "@/lib/mcp-token"
import { getPineconeIndex, getUserPineconeNamespace } from "@/lib/pinecone"
import { generateEmbedding } from "@/lib/embeddings"

/**
 * Authenticate user from MCP token
 */
async function authenticateUser(token: string) {
  if (!token || !token.startsWith("inky_")) {
    return null
  }

  const tokenHash = hashToken(token)

  // Find user by token hash
  const user = await prisma.user.findUnique({
    where: { mcp_access_token: tokenHash },
    select: { id: true },
  })

  return user
}

/**
 * MCP Protocol HTTP Endpoint
 * Handles tools/list and tools/call requests
 */
export async function POST(req: Request) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: "Unauthorized",
            data: "Missing or invalid Authorization header",
          },
        },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7) // Remove "Bearer " prefix
    const user = await authenticateUser(token)

    if (!user) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: "Unauthorized",
            data: "Invalid access token",
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
              name: "search_rules",
              description: "Search user's coding rules using semantic similarity",
              inputSchema: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "Search query to find relevant rules",
                  },
                  repository_id: {
                    type: "string",
                    description: "Optional repository ID to filter rules",
                  },
                  top_k: {
                    type: "number",
                    description: "Number of results to return (default: 5)",
                    default: 5,
                  },
                },
                required: ["query"],
              },
            },
            {
              name: "get_rule",
              description: "Get a specific rule by ID",
              inputSchema: {
                type: "object",
                properties: {
                  rule_id: {
                    type: "string",
                    description: "The ID of the rule to retrieve",
                  },
                },
                required: ["rule_id"],
              },
            },
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

      // Handle different tools
      if (name === "search_rules") {
        const { query, repository_id, top_k = 5 } = toolArgs || {}

        if (!query || typeof query !== "string") {
          return NextResponse.json(
            {
              jsonrpc: "2.0",
              error: {
                code: -32602,
                message: "Invalid params",
                data: "Missing or invalid query parameter",
              },
              id,
            },
            { status: 400 }
          )
        }

        try {
          // Generate embedding for query
          const queryEmbedding = await generateEmbedding(query)

          // Search in user's Pinecone namespace
          const index = getPineconeIndex()
          const namespace = getUserPineconeNamespace(user.id)
          const searchResults = await index.namespace(namespace).query({
            vector: queryEmbedding,
            topK: top_k,
            includeMetadata: true,
            filter: {
              user_id: user.id,
              ...(repository_id ? { repository_id: repository_id } : {}),
              type: "rule",
            },
          })

          // Fetch full rule data from database
          const ruleIds = searchResults.matches
            .map((match) => match.metadata?.rule_id)
            .filter((id): id is string => typeof id === "string")

          const rules = await prisma.rule.findMany({
            where: {
              id: { in: ruleIds },
              user_id: user.id,
            },
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

          const rulesWithScores = rules.map((rule) => {
            const match = searchResults.matches.find(
              (m) => m.metadata?.rule_id === rule.id
            )
            return {
              ...rule,
              relevance_score: match?.score ?? 0,
            }
          })

          rulesWithScores.sort((a, b) => b.relevance_score - a.relevance_score)

          return NextResponse.json({
            jsonrpc: "2.0",
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(rulesWithScores, null, 2),
                },
              ],
            },
            id,
          })
        } catch (error) {
          console.error("[MCP] Error searching rules:", error)
          return NextResponse.json(
            {
              jsonrpc: "2.0",
              error: {
                code: -32603,
                message: "Internal error",
                data: "Failed to search rules",
              },
              id,
            },
            { status: 500 }
          )
        }
      }

      if (name === "get_rule") {
        const { rule_id } = toolArgs || {}

        if (!rule_id || typeof rule_id !== "string") {
          return NextResponse.json(
            {
              jsonrpc: "2.0",
              error: {
                code: -32602,
                message: "Invalid params",
                data: "Missing or invalid rule_id parameter",
              },
              id,
            },
            { status: 400 }
          )
        }

        try {
          const rule = await prisma.rule.findFirst({
            where: {
              id: rule_id,
              user_id: user.id,
            },
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

          if (!rule) {
            return NextResponse.json(
              {
                jsonrpc: "2.0",
                error: {
                  code: -32602,
                  message: "Invalid params",
                  data: "Rule not found",
                },
                id,
              },
              { status: 404 }
            )
          }

          return NextResponse.json({
            jsonrpc: "2.0",
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(rule, null, 2),
                },
              ],
            },
            id,
          })
        } catch (error) {
          console.error("[MCP] Error getting rule:", error)
          return NextResponse.json(
            {
              jsonrpc: "2.0",
              error: {
                code: -32603,
                message: "Internal error",
                data: "Failed to get rule",
              },
              id,
            },
            { status: 500 }
          )
        }
      }

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

