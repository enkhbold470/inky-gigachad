import { Pinecone } from "@pinecone-database/pinecone"
import { getUserNamespace } from "./pinecone-user"

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
 * Get Pinecone index (always uses shared index)
 * Use getUserNamespace() to get the namespace for user-specific operations
 */
export function getPineconeIndex(indexName?: string) {
  const client = getPineconeClient()
  return client.index(indexName || DEFAULT_INDEX_NAME)
}

/**
 * Get user's namespace for Pinecone operations
 */
export function getUserPineconeNamespace(userId: string): string {
  return getUserNamespace(userId)
}



