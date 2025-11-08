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

