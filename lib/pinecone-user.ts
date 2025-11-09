/**
 * Get user's Pinecone namespace
 * Uses namespaces within a single shared index instead of separate indexes
 */
export function getUserNamespace(userId: string): string {
  return `user_${userId}`
}

