import { auth, clerkClient } from "@clerk/nextjs/server"

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  owner: {
    login: string
    avatar_url: string
  }
  description: string | null
  html_url: string
  language: string | null
  stargazers_count: number
  forks_count: number
  updated_at: string
  private: boolean
}

export interface GitHubCommit {
  sha: string
  commit: {
    message: string
    author: {
      name: string
      email: string
      date: string
    }
  }
  html_url: string
  author: {
    login: string
    avatar_url: string
  } | null
  files?: {
    filename: string
    status: string
    additions: number
    deletions: number
    changes: number
    patch?: string
  }[]
  stats?: {
    additions: number
    deletions: number
    total: number
  }
}

/**
 * Get the GitHub access token for the authenticated user
 */
export async function getGitHubAccessToken(): Promise<string | null> {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error("Unauthorized")
  }

  const client = await clerkClient()
  const provider = "oauth_github"
  
  try {
    const clerkResponse = await client.users.getUserOauthAccessToken(userId, provider)
    
    if (clerkResponse.data.length > 0 && clerkResponse.data[0].token) {
      return clerkResponse.data[0].token
    }
  } catch (error) {
    console.error("Error fetching GitHub token:", error)
  }
  
  return null
}

/**
 * Fetch all repositories for the authenticated user
 */
export async function fetchGitHubRepos(): Promise<GitHubRepo[]> {
  const token = await getGitHubAccessToken()
  
  if (!token) {
    throw new Error("GitHub access token not found. Please reconnect your GitHub account.")
  }

  try {
    // Fetch user's own repos
    const userReposResponse = await fetch(
      "https://api.github.com/user/repos?sort=updated&per_page=100",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    )

    if (!userReposResponse.ok) {
      throw new Error(`GitHub API error: ${userReposResponse.statusText}`)
    }

    const userRepos = await userReposResponse.json()

    // Fetch repos from organizations (optional)
    const installationsResponse = await fetch(
      "https://api.github.com/user/installations",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
        next: { revalidate: 300 },
      }
    )

    let orgRepos: GitHubRepo[] = []
    if (installationsResponse.ok) {
      const installations = await installationsResponse.json()
      
      // Fetch repos from each installation
      for (const installation of installations.installations || []) {
        const reposResponse = await fetch(
          `https://api.github.com/user/installations/${installation.id}/repositories?per_page=100`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github.v3+json",
            },
            next: { revalidate: 300 },
          }
        )
        
        if (reposResponse.ok) {
          const data = await reposResponse.json()
          orgRepos = [...orgRepos, ...(data.repositories || [])]
        }
      }
    }

    // Combine and deduplicate repos
    const allRepos = [...userRepos, ...orgRepos]
    const uniqueRepos = Array.from(
      new Map(allRepos.map((repo) => [repo.id, repo])).values()
    )

    return uniqueRepos
  } catch (error) {
    console.error("Error fetching GitHub repos:", error)
    throw error
  }
}

/**
 * Fetch commits for a specific repository
 */
export async function fetchGitHubCommits(
  owner: string,
  repo: string,
  page = 1,
  perPage = 10
): Promise<GitHubCommit[]> {
  const token = await getGitHubAccessToken()
  
  if (!token) {
    throw new Error("GitHub access token not found")
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?page=${page}&per_page=${perPage}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
        next: { revalidate: 60 }, // Cache for 1 minute
      }
    )

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`)
    }

    const commits = await response.json()
    return commits
  } catch (error) {
    console.error("Error fetching commits:", error)
    throw error
  }
}

/**
 * Fetch detailed commit information including files changed
 */
export async function fetchCommitDetails(
  owner: string,
  repo: string,
  sha: string
): Promise<GitHubCommit> {
  const token = await getGitHubAccessToken()
  
  if (!token) {
    throw new Error("GitHub access token not found")
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits/${sha}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    )

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`)
    }

    const commit = await response.json()
    return commit
  } catch (error) {
    console.error("Error fetching commit details:", error)
    throw error
  }
}

/**
 * Check if file is an image
 */
export function isImageFile(filename: string): boolean {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp']
  return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext))
}

/**
 * Extract image URLs from commit files
 */
export function extractImagesFromCommit(commit: GitHubCommit, repoUrl: string): string[] {
  if (!commit.files) return []
  
  return commit.files
    .filter(file => isImageFile(file.filename) && file.status !== 'removed')
    .map(file => {
      // Construct raw GitHub URL for images
      const branch = 'main' // or 'master' - you might want to make this configurable
      return `https://raw.githubusercontent.com/${repoUrl}/${branch}/${file.filename}`
    })
}

/**
 * Check if commit message contains #neurofocus tag
 */
export function hasNeuroFocusTag(commitMessage: string): boolean {
  return /\#neurofocus/i.test(commitMessage)
}

/**
 * Fetch markdown files from a GitHub repository
 */
export async function fetchMarkdownFilesFromRepo(
  owner: string,
  repo: string
): Promise<Array<{ path: string; content: string; size: number }>> {
  const token = await getGitHubAccessToken()
  
  if (!token) {
    throw new Error("GitHub access token not found")
  }

  try {
    // Get repository info to find default branch
    const repoResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
        next: { revalidate: 300 },
      }
    )

    if (!repoResponse.ok) {
      throw new Error(`GitHub API error: ${repoResponse.statusText}`)
    }

    const repoData = await repoResponse.json()
    const defaultBranch = repoData.default_branch || "main"

    // Get recursive tree to find all markdown files
    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
        next: { revalidate: 300 },
      }
    )

    if (!treeResponse.ok) {
      throw new Error(`GitHub API error: ${treeResponse.statusText}`)
    }

    const treeData = await treeResponse.json()
    
    // Check if tree was truncated (GitHub API limitation)
    if (treeData.truncated) {
      console.warn(`[fetchMarkdownFilesFromRepo] Tree was truncated for ${owner}/${repo}. Some files may be missing.`)
      // For truncated trees, we might need to use a different approach (e.g., search API)
      // For now, we'll proceed with what we have
    }
    
    console.log(`[fetchMarkdownFilesFromRepo] Tree contains ${treeData.tree?.length || 0} total files`)
    
    // Filter for markdown files
    const allBlobs = (treeData.tree || []).filter((file: { type: string }) => file.type === "blob")
    const markdownBlobs = allBlobs.filter(
      (file: { path: string }) => file.path.endsWith(".md") || file.path.endsWith(".mdc")
    )
    
    console.log(`[fetchMarkdownFilesFromRepo] Found ${markdownBlobs.length} markdown files before exclusions`)
    
    const markdownFiles = markdownBlobs.filter(
      (file: { path: string; type: string; size?: number }) =>
        !file.path.includes("node_modules") &&
        !file.path.includes(".next") &&
        !file.path.includes(".git")
    )
    
    console.log(`[fetchMarkdownFilesFromRepo] Found ${markdownFiles.length} markdown files after filtering`)
    console.log(`[fetchMarkdownFilesFromRepo] Markdown files:`, markdownFiles.map((f: { path: string }) => f.path).join(", "))

    // Fetch content for each markdown file
    const filesWithContent: Array<{ path: string; content: string; size: number }> = []
    let successCount = 0
    let errorCount = 0
    
    for (const file of markdownFiles) {
      try {
        const contentResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(file.path)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github.v3+json",
            },
            next: { revalidate: 300 },
          }
        )

        if (contentResponse.ok) {
          const contentData = await contentResponse.json()
          if (contentData.encoding === "base64" && contentData.content) {
            const content = Buffer.from(contentData.content, "base64").toString("utf-8")
            filesWithContent.push({
              path: file.path,
              content,
              size: contentData.size || file.size || 0,
            })
            successCount++
          } else {
            console.warn(`[fetchMarkdownFilesFromRepo] File ${file.path} has unexpected encoding: ${contentData.encoding}`)
            errorCount++
          }
        } else {
          console.warn(`[fetchMarkdownFilesFromRepo] Failed to fetch ${file.path}: ${contentResponse.status} ${contentResponse.statusText}`)
          errorCount++
        }
      } catch (error) {
        console.error(`[fetchMarkdownFilesFromRepo] Error fetching file ${file.path}:`, error)
        errorCount++
        // Continue with other files
      }
    }

    console.log(`[fetchMarkdownFilesFromRepo] Successfully fetched ${successCount} files, ${errorCount} errors`)
    return filesWithContent
  } catch (error) {
    console.error(`Error fetching markdown files from ${owner}/${repo}:`, error)
    throw error
  }
}

