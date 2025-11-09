import { generateEmbedding } from "@/lib/embeddings"
import { getPineconeIndex, getUserPineconeNamespace } from "@/lib/pinecone"
import type { MarkdownFileInfo } from "@/lib/markdown-context"

const CHUNK_SIZE = 1000 // Characters per chunk
const CHUNK_OVERLAP = 200 // Overlap between chunks

/**
 * Split text into chunks for better vector indexing
 */
function chunkText(text: string, chunkSize: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): string[] {
  // Validate inputs
  if (!text || typeof text !== 'string') {
    console.warn('[chunkText] Invalid text input, returning empty array')
    return []
  }
  
  if (text.length === 0) {
    return []
  }
  
  // Ensure overlap is less than chunkSize to prevent infinite loops
  const safeOverlap = Math.min(overlap, Math.max(0, chunkSize - 1))
  const safeChunkSize = Math.max(1, chunkSize)
  
  const chunks: string[] = []
  let start = 0
  const maxIterations = Math.ceil(text.length / Math.max(1, safeChunkSize - safeOverlap)) + 10 // Safety limit
  let iterations = 0

  while (start < text.length && iterations < maxIterations) {
    const end = Math.min(start + safeChunkSize, text.length)
    const chunk = text.slice(start, end)
    
    if (chunk.length > 0) {
      chunks.push(chunk)
    }
    
    // Move start forward, ensuring we make progress
    const nextStart = end - safeOverlap
    if (nextStart <= start) {
      // Safety check: ensure we always move forward
      start = start + 1
    } else {
      start = nextStart
    }
    
    iterations++
  }
  
  if (iterations >= maxIterations) {
    console.warn(`[chunkText] Hit iteration limit for text of length ${text.length}`)
  }

  return chunks.length > 0 ? chunks : [text] // Fallback to single chunk if something went wrong
}

/**
 * Index markdown files to Pinecone
 */
export async function indexMarkdownFilesToPinecone(
  files: Array<{ path: string; content: string; size: number }>,
  userId: string,
  repositoryIds: string[],
  onLog?: (level: string, message: string) => void
): Promise<{ indexed: number; failed: number; logs?: Array<{ level: string; message: string; timestamp: number }> }> {
  const logs: Array<{ level: string; message: string; timestamp: number }> = []
  const addLog = (level: string, message: string) => {
    logs.push({ level, message, timestamp: Date.now() })
    console.log(`[${level.toUpperCase()}] ${message}`)
    onLog?.(level, message)
  }

  addLog('info', `Starting indexing for ${files.length} files`)
  const index = getPineconeIndex()
  const namespace = getUserPineconeNamespace(userId)
  let indexed = 0
  let failed = 0

  for (const file of files) {
    try {
      // Validate file content
      if (!file.content || typeof file.content !== 'string') {
        const msg = `Invalid content for file ${file.path}, skipping`
        console.warn(`[indexMarkdownFilesToPinecone] ${msg}`)
        addLog('warn', msg)
        failed++
        continue
      }
      
      // Split large files into chunks
      const chunks = file.content.length > CHUNK_SIZE 
        ? chunkText(file.content, CHUNK_SIZE, CHUNK_OVERLAP)
        : [file.content]

      if (chunks.length === 0) {
        const msg = `No chunks generated for file ${file.path}, skipping`
        console.warn(`[indexMarkdownFilesToPinecone] ${msg}`)
        addLog('warn', msg)
        failed++
        continue
      }

      addLog('info', `Processing file ${file.path} (${chunks.length} chunks)`)

      // Index each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const chunkId = `md_${userId}_${Buffer.from(file.path).toString('base64url')}_${i}`
        
        try {
          const embedding = await generateEmbedding(chunk)
          
          await index.namespace(namespace).upsert([
            {
              id: chunkId,
              values: embedding,
              metadata: {
                user_id: userId,
                type: "markdown",
                file_path: file.path,
                chunk_index: i,
                total_chunks: chunks.length,
                repository_ids: repositoryIds.join(","),
                content: chunk.substring(0, 500), // Store first 500 chars for preview
              },
            },
          ])
          
          indexed++
        } catch (error) {
          const msg = `Error indexing chunk ${i} of ${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}`
          console.error(`[indexMarkdownFilesToPinecone] ${msg}`)
          addLog('error', msg)
          failed++
        }
      }
    } catch (error) {
      const msg = `Error processing file ${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(`[indexMarkdownFilesToPinecone] ${msg}`)
      addLog('error', msg)
      failed++
    }
  }

  addLog('info', `Indexing complete: ${indexed} indexed, ${failed} failed`)
  return { indexed, failed, logs }
}

/**
 * Use RAG to generate rules from indexed markdown content
 */
export async function generateRulesWithRAG(
  query: string,
  userId: string,
  repositoryIds: string[],
  topK: number = 10
): Promise<string> {
  console.log(`[generateRulesWithRAG] Starting RAG generation for user ${userId}`)
  console.log(`[generateRulesWithRAG] Query: ${query.substring(0, 100)}...`)
  
  const { generateEmbedding } = await import("@/lib/embeddings")
  const index = getPineconeIndex()
  const namespace = getUserPineconeNamespace(userId)
  const OpenAI = (await import("openai")).default

  // Generate embedding for the query
  console.log(`[generateRulesWithRAG] Generating query embedding...`)
  const queryEmbedding = await generateEmbedding(query)

  // Search for relevant markdown chunks
  // Build filter - Pinecone uses string matching for metadata
  const filter: any = {
    user_id: userId,
    type: "markdown",
  }
  
  // If repository IDs provided, filter by them (repository_ids is stored as comma-separated string)
  if (repositoryIds.length > 0) {
    // Since repository_ids is stored as comma-separated string, we need to check if any match
    // For now, we'll search without repository filter and filter in code
    // Or we can use $in if Pinecone supports it
  }

  console.log(`[generateRulesWithRAG] Searching Pinecone with topK=${topK * 2}...`)
  const searchResults = await index.namespace(namespace).query({
    vector: queryEmbedding,
    topK: topK * 2, // Get more results to filter
    includeMetadata: true,
    filter,
  })

  // Filter by repository IDs if provided
  const filteredResults = repositoryIds.length > 0
    ? searchResults.matches.filter((match) => {
        const repoIds = match.metadata?.repository_ids as string
        if (!repoIds) return false
        const repoIdArray = repoIds.split(",")
        return repositoryIds.some((id) => repoIdArray.includes(id))
      })
    : searchResults.matches

  console.log(`[generateRulesWithRAG] Found ${searchResults.matches.length} matches, ${filteredResults.length} after filtering`)

  // Extract relevant context from search results
  const contextChunks = filteredResults
    .slice(0, topK) // Take top K after filtering
    .map((match) => match.metadata?.content as string)
    .filter((content): content is string => typeof content === "string")

  const context = contextChunks.join("\n\n---\n\n")
  console.log(`[generateRulesWithRAG] Extracted ${contextChunks.length} context chunks (${context.length} chars)`)

  // Generate rules using OpenAI with RAG context
  console.log(`[generateRulesWithRAG] Calling OpenAI API...`)
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert at analyzing code repositories and generating comprehensive coding rules and guidelines. 
Your task is to create detailed, actionable coding rules based on:
1. The user's selected repositories
2. Context retrieved from markdown documentation files using RAG (Retrieval Augmented Generation)

Generate rules that are:
- Specific and actionable
- Based on patterns found in the repositories
- Aligned with best practices from the retrieved markdown context
- Well-structured and easy to follow
- Focused on code style, architecture, and best practices`,
      },
      {
        role: "user",
        content: `Based on the following query and retrieved context from markdown files, generate comprehensive coding rules:

## Query:
${query}

## Retrieved Context from Markdown Files (RAG):
${context || "No relevant context found in markdown files."}

Please generate detailed coding rules that:
1. Reflect the coding patterns and preferences from the selected repositories
2. Incorporate best practices from the retrieved markdown documentation context
3. Are specific and actionable
4. Include guidelines for code style, architecture, testing, and best practices
5. Are formatted clearly and are easy to follow

Return ONLY the rule content, no explanations or meta-commentary.`,
      },
    ],
    temperature: 0.7,
    max_tokens: 2000,
  })

  const ruleContent = completion.choices[0]?.message?.content?.trim() || ""
  console.log(`[generateRulesWithRAG] ✅ Generated rule content (${ruleContent.length} chars)`)
  return ruleContent
}

