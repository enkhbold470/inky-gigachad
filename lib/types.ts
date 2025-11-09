import type { GitHubRepo } from "@/lib/github"

export interface Repository {
  id: string
  github_id: number
  name: string
  full_name: string
  owner: string
  description: string | null
  language: string | null
  stars: number
  is_private: boolean
  html_url: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface Rule {
  id: string
  name: string
  content: string
  version: number
  is_active: boolean
  repository_id: string | null
  created_at: Date
  updated_at?: Date
  relevance_score?: number
}

export interface RuleTemplate {
  id: string
  name: string
  description: string | null
  content: string
  category: string | null
  author: string | null
  x_account: string | null
  created_at: Date
}

export interface CodingSessionRule {
  id: string
  session_id: string
  rule_id: string
  relevance_score: number | null
  rule: {
    id: string
    name: string
    content: string
    version: number
  }
}

export interface CodingSession {
  id: string
  title: string
  description: string | null
  context: string | null
  repository_id: string | null
  started_at: Date
  ended_at: Date | null
  is_active: boolean
  repository?: {
    id: string
    name: string
    full_name: string
  } | null
  rules?: CodingSessionRule[]
}

