import { Pinecone } from "@pinecone-database/pinecone"

let pineconeClient: Pinecone | null = null

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

export async function getPineconeIndex(indexName: string = "inky-rules") {
  const client = getPineconeClient()
  return client.index(indexName)
}

