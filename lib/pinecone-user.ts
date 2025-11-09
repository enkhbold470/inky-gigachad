import { getPineconeClient } from "./pinecone"
import { prisma } from "./prisma"

const EMBEDDING_DIMENSION = 1536 // text-embedding-3-small dimension
const INDEX_METRIC = "cosine" as const

/**
 * Get or create a Pinecone index for a user
 * Returns the index name
 */
export async function getOrCreateUserIndex(userId: string): Promise<string> {
  // Check if user already has an index
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pinecone_index_name: true },
  })

  if (user?.pinecone_index_name) {
    return user.pinecone_index_name
  }

  // Generate a unique index name
  const indexName = `inky-rules-${userId}`

  try {
    const client = getPineconeClient()

    // Check if index already exists
    const existingIndexes = await client.listIndexes()
    const indexExists = existingIndexes.indexes?.some(
      (idx) => idx.name === indexName
    )

    if (!indexExists) {
      // Create the index
      await client.createIndex({
        name: indexName,
        dimension: EMBEDDING_DIMENSION,
        metric: INDEX_METRIC,
        spec: {
          serverless: {
            region: process.env.PINECONE_REGION || "us-east-1",
            cloud: "aws",
          },
        },
      })

      // Wait a bit for index to be ready (Pinecone may need a moment)
      // In production, you might want to poll until ready
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    // Store index name in database
    await prisma.user.update({
      where: { id: userId },
      data: { pinecone_index_name: indexName },
    })

    return indexName
  } catch (error) {
    console.error(`[getOrCreateUserIndex] Error creating index for user ${userId}:`, error)
    // If index creation fails, we'll fall back to default index
    // This allows the system to continue functioning
    throw new Error(`Failed to create Pinecone index: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Initialize user's Pinecone index if it doesn't exist
 * This is a helper that can be called during user creation or first operation
 */
export async function initializeUserIndex(userId: string): Promise<string | null> {
  try {
    return await getOrCreateUserIndex(userId)
  } catch (error) {
    console.error(`[initializeUserIndex] Failed to initialize index for user ${userId}:`, error)
    return null
  }
}

