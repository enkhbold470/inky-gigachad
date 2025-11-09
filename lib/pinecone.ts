import { Pinecone } from "@pinecone-database/pinecone"

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

export async function getPineconeIndex(indexName: string = DEFAULT_INDEX_NAME) {
  const client = getPineconeClient()
  return client.index(indexName)
}



