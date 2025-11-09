import { Pinecone } from "@pinecone-database/pinecone"
import { getOrCreateUserIndex } from "./pinecone-user"

let pineconeClient: Pinecone | null = null

const DEFAULT_INDEX_NAME = process.env.PINECONE_INDEX || "inky-rules"

export function getPineconeClient(): Pinecone {
  if (pineconeClient) {
    return pineconeClient
  }

  const apiKey = process.env.PINECONE_API_KEY
  if (!apiKey) {
    throw new Error("PINECONE_API_KEY environment variable is not set")
  }

  pineconeClient = new Pinecone({
    apiKey,
  })

  return pineconeClient
}

/**
 * Get Pinecone index, optionally for a specific user
 * If userId is provided, uses the user's dedicated index
 * Otherwise, uses the default shared index
 */
export async function getPineconeIndex(indexName?: string, userId?: string) {
  const client = getPineconeClient()
  
  // If userId is provided, get or create user-specific index
  if (userId) {
    try {
      const userIndexName = await getOrCreateUserIndex(userId)
      return client.index(userIndexName)
    } catch (error) {
      console.error(`[getPineconeIndex] Failed to get user index, falling back to default:`, error)
      // Fall back to default index if user index creation fails
      return client.index(indexName || DEFAULT_INDEX_NAME)
    }
  }
  
  // Use provided index name or default
  return client.index(indexName || DEFAULT_INDEX_NAME)
}



