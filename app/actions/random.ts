"use server"

import { fetchGitHubRepos, fetchGitHubCommits, type GitHubRepo, type GitHubCommit } from "@/lib/github"
import { auth } from "@clerk/nextjs/server"

export async function getRepositories(): Promise<{ success: boolean; data?: GitHubRepo[]; error?: string }> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("[GET REPOSITORIES] Starting GitHub repositories fetch...")
  
  try {
    console.log("[GET REPOSITORIES] Step 1: Authenticating with Clerk...")
    const { userId } = await auth()
    console.log("[GET REPOSITORIES] Clerk userId:", userId ? "✓ Found" : "✗ Not found")
    
    if (!userId) {
      console.error("[GET REPOSITORIES] ✗ User not authenticated!")
      return { success: false, error: "Not authenticated" }
    }
    console.log("[GET REPOSITORIES] ✓ User authenticated:", userId)

    console.log("[GET REPOSITORIES] Step 2: Fetching repos from GitHub API...")
    const repos = await fetchGitHubRepos()
    console.log("[GET REPOSITORIES] ✓ Found", repos?.length || 0, "repositories")
    
    if (repos && repos.length > 0) {
      console.log("[GET REPOSITORIES] Sample repos:", repos.slice(0, 3).map(r => r.full_name).join(", "))
    }
    
    console.log("[GET REPOSITORIES] ✅ SUCCESS!")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    return { success: true, data: repos }
  } catch (error) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.error("[GET REPOSITORIES] ✗ ERROR occurred!")
    console.error("[GET REPOSITORIES] Error type:", error?.constructor?.name)
    console.error("[GET REPOSITORIES] Error message:", error instanceof Error ? error.message : "Unknown error")
    console.error("[GET REPOSITORIES] Full error:", error)
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch repositories",
    }
  }
}

export async function getCommits(
  owner: string,
  repo: string,
  page = 1
): Promise<{ success: boolean; data?: GitHubCommit[]; error?: string }> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("[GET COMMITS] Starting GitHub commits fetch...")
  console.log("[GET COMMITS] Repository:", `${owner}/${repo}`)
  console.log("[GET COMMITS] Page:", page)
  
  try {
    console.log("[GET COMMITS] Step 1: Authenticating with Clerk...")
    const { userId } = await auth()
    console.log("[GET COMMITS] Clerk userId:", userId ? "✓ Found" : "✗ Not found")
    
    if (!userId) {
      console.error("[GET COMMITS] ✗ User not authenticated!")
      return { success: false, error: "Not authenticated" }
    }
    console.log("[GET COMMITS] ✓ User authenticated:", userId)

    console.log("[GET COMMITS] Step 2: Fetching commits from GitHub API...")
    const commits = await fetchGitHubCommits(owner, repo, page)
    console.log("[GET COMMITS] ✓ Found", commits?.length || 0, "commits")
    
    if (commits && commits.length > 0) {
      console.log("[GET COMMITS] Recent commits:", commits.slice(0, 3).map(c => c.sha.substring(0, 7)).join(", "))
    }
    
    console.log("[GET COMMITS] ✅ SUCCESS!")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    return { success: true, data: commits }
  } catch (error) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.error("[GET COMMITS] ✗ ERROR occurred!")
    console.error("[GET COMMITS] Error type:", error?.constructor?.name)
    console.error("[GET COMMITS] Error message:", error instanceof Error ? error.message : "Unknown error")
    console.error("[GET COMMITS] Full error:", error)
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch commits",
    }
  }
}

