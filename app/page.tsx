"use client"

import { useEffect, useState, useCallback } from "react"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Header } from "@/components/header"
import { getRepositories } from "@/app/actions/random"
import { saveRepository, getActiveRepository } from "@/app/actions/repo_actions"
import { createRule, getUserRules, searchRules, deleteRule } from "@/app/actions/rule_actions"
import { getPublicTemplates, loadEmergentTemplates } from "@/app/actions/template_actions"
import { createSession, getUserSessions, endSession } from "@/app/actions/session_actions"
import { Github, Plus, BookOpen, Code, Search, Trash2, Square, Loader2 } from "lucide-react"
import type { GitHubRepo } from "@/lib/github"
import type { Repository, Rule, RuleTemplate, CodingSession } from "@/lib/types"
import { toast } from "sonner"

export default function Dashboard() {
  const { user, isLoaded } = useUser()
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([])
  const [activeRepo, setActiveRepo] = useState<Repository | null>(null)
  const [rules, setRules] = useState<Rule[]>([])
  const [templates, setTemplates] = useState<RuleTemplate[]>([])
  const [sessions, setSessions] = useState<CodingSession[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Rule creation state
  const [ruleName, setRuleName] = useState("")
  const [ruleContent, setRuleContent] = useState("")
  const [showRuleDialog, setShowRuleDialog] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [isCreatingRule, setIsCreatingRule] = useState(false)
  const [isIndexingRule, setIsIndexingRule] = useState(false)

  // Session creation state
  const [sessionTitle, setSessionTitle] = useState("")
  const [sessionContext, setSessionContext] = useState("")
  const [showSessionDialog, setShowSessionDialog] = useState(false)

  const loadData = useCallback(async () => {
    if (!isLoaded || !user) return
    
    console.log("[Dashboard] loadData called")
    setLoading(true)
    try {
      // Load GitHub repos
      console.log("[Dashboard] Calling getRepositories...")
      const reposResult = await getRepositories()
      console.log("[Dashboard] getRepositories result:", reposResult.success ? "✓ Success" : "✗ Failed")
      if (reposResult.success && reposResult.data) {
        setGithubRepos(reposResult.data)
      }

      // Load active repo
      console.log("[Dashboard] Calling getActiveRepository...")
      const activeRepoResult = await getActiveRepository()
      console.log("[Dashboard] getActiveRepository result:", activeRepoResult.success ? "✓ Success" : "✗ Failed")
      if (activeRepoResult.success && activeRepoResult.data) {
        setActiveRepo(activeRepoResult.data)
        loadRulesForRepo(activeRepoResult.data.id)
      }

      // Load templates
      console.log("[Dashboard] Loading templates...")
      await loadTemplates()

      // Load sessions
      console.log("[Dashboard] Calling getUserSessions...")
      const sessionsResult = await getUserSessions(activeRepoResult.data?.id, true)
      console.log("[Dashboard] getUserSessions result:", sessionsResult.success ? "✓ Success" : "✗ Failed")
      if (sessionsResult.success && sessionsResult.data) {
        setSessions(sessionsResult.data)
      }
    } catch (error) {
      console.error("[Dashboard] ✗ Error loading data:", error)
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [isLoaded, user])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function loadTemplates() {
    // First try to load emergent templates
    await loadEmergentTemplates()
    
    // Then load public templates
    const templatesResult = await getPublicTemplates()
    if (templatesResult.success && templatesResult.data) {
      setTemplates(templatesResult.data)
    }
  }

  async function loadRulesForRepo(repoId?: string) {
    const rulesResult = await getUserRules(repoId)
    if (rulesResult.success && rulesResult.data) {
      setRules(rulesResult.data)
    }
  }

  async function handleSaveRepo(repo: GitHubRepo) {
    console.log("[Dashboard] handleSaveRepo called, repo:", repo.name)
    console.log("[Dashboard] Calling saveRepository server action...")
    const result = await saveRepository(repo)
    console.log("[Dashboard] saveRepository result:", result.success ? "✓ Success" : "✗ Failed", result.error || "")
    if (result.success) {
      toast.success(`Repository ${repo.name} saved`)
      await loadData()
    } else {
      toast.error(result.error || "Failed to save repository")
    }
  }

  async function handleCreateRule() {
    console.log("[Dashboard] handleCreateRule called")
    if (!ruleName || !ruleContent) {
      console.error("[Dashboard] ✗ Validation failed: missing fields")
      toast.error("Please fill in all fields")
      return
    }

    setIsCreatingRule(true)
    setIsIndexingRule(false)

    try {
      console.log("[Dashboard] Calling createRule server action...")
      const result = await createRule({
        name: ruleName,
        content: ruleContent,
        repository_id: activeRepo?.id,
      })
      console.log("[Dashboard] createRule result:", result.success ? "✓ Success" : "✗ Failed", result.error || "")

      if (result.success) {
        toast.success("Rule created successfully!")
        setIsCreatingRule(false)
        setIsIndexingRule(true)
        
        // Show indexing message
        toast.info("Indexing rule in Pinecone...", { duration: 3000 })
        
        setRuleName("")
        setRuleContent("")
        setShowRuleDialog(false)
        setSelectedTemplate("")
        await loadRulesForRepo(activeRepo?.id)
        
        // Reset indexing state after a delay
        setTimeout(() => {
          setIsIndexingRule(false)
        }, 2000)
      } else {
        toast.error(result.error || "Failed to create rule")
      }
    } catch (error) {
      console.error("[Dashboard] ✗ Error creating rule:", error)
      toast.error("Failed to create rule")
    } finally {
      setIsCreatingRule(false)
      setIsIndexingRule(false)
    }
  }

  async function handleSelectTemplate() {
    if (!selectedTemplate) return

    const template = templates.find((t) => t.id === selectedTemplate)
    if (template) {
      setRuleName(template.name)
      setRuleContent(template.content)
    }
  }

  async function handleSearchRules() {
    console.log("[Dashboard] handleSearchRules called, query:", searchQuery)
    if (!searchQuery.trim()) {
      console.log("[Dashboard] Empty query, loading all rules...")
      await loadRulesForRepo(activeRepo?.id)
      return
    }

    console.log("[Dashboard] Calling searchRules server action...")
    const result = await searchRules(searchQuery, activeRepo?.id, 10)
    console.log("[Dashboard] searchRules result:", result.success ? "✓ Success" : "✗ Failed", result.error || "")
    if (result.success && result.data) {
      setRules(result.data)
    } else {
      toast.error(result.error || "Failed to search rules")
    }
  }

  async function handleDeleteRule(ruleId: string) {
    console.log("[Dashboard] handleDeleteRule called, ruleId:", ruleId)
    if (!confirm("Are you sure you want to delete this rule?")) return

    console.log("[Dashboard] Calling deleteRule server action...")
    const result = await deleteRule(ruleId)
    console.log("[Dashboard] deleteRule result:", result.success ? "✓ Success" : "✗ Failed", result.error || "")
    if (result.success) {
      toast.success("Rule deleted")
      await loadRulesForRepo(activeRepo?.id)
    } else {
      toast.error(result.error || "Failed to delete rule")
    }
  }

  async function handleCreateSession() {
    console.log("[Dashboard] handleCreateSession called")
    if (!sessionTitle) {
      console.error("[Dashboard] ✗ Validation failed: missing title")
      toast.error("Please enter a session title")
      return
    }

    console.log("[Dashboard] Calling createSession server action...")
    const result = await createSession({
      title: sessionTitle,
      context: sessionContext,
      repository_id: activeRepo?.id,
    })
    console.log("[Dashboard] createSession result:", result.success ? "✓ Success" : "✗ Failed", result.error || "")

    if (result.success) {
      toast.success("Session created")
      setSessionTitle("")
      setSessionContext("")
      setShowSessionDialog(false)
      await loadData()
    } else {
      toast.error(result.error || "Failed to create session")
    }
  }

  async function handleEndSession(sessionId: string) {
    console.log("[Dashboard] handleEndSession called, sessionId:", sessionId)
    console.log("[Dashboard] Calling endSession server action...")
    const result = await endSession(sessionId)
    console.log("[Dashboard] endSession result:", result.success ? "✓ Success" : "✗ Failed", result.error || "")
    if (result.success) {
      toast.success("Session ended")
      await loadData()
    } else {
      toast.error(result.error || "Failed to end session")
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Please sign in to continue</div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <Header />
        <div className="flex min-h-[calc(100vh-73px)] items-center justify-center">
          <div className="text-center">
            <div className="text-lg">Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header />
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">Manage your coding memory layer</p>
            </div>
          </div>

        {/* Repository Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="size-5" />
              GitHub Repositories
            </CardTitle>
            <CardDescription>
              {activeRepo ? `Active: ${activeRepo.full_name}` : "Select a repository to get started"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {githubRepos.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No repositories found. Make sure you&apos;re connected to GitHub.
                </div>
              ) : (
                githubRepos.map((repo) => (
                  <div
                    key={repo.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{repo.full_name}</div>
                      {repo.description && (
                        <div className="text-sm text-muted-foreground truncate">{repo.description}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {repo.language && <span>{repo.language} • </span>}
                        ⭐ {repo.stargazers_count} {repo.private && "• 🔒 Private"}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSaveRepo(repo)}
                      variant={activeRepo?.github_id === repo.id ? "default" : "outline"}
                      className="ml-4 shrink-0"
                    >
                      {activeRepo?.github_id === repo.id ? "Active" : "Select"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Rules Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="size-5" />
                  Rules
                </CardTitle>
                <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="size-4" />
                      New Rule
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Rule</DialogTitle>
                      <DialogDescription>
                        Add a new coding rule or select from templates
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Template</label>
                        <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a template" />
                          </SelectTrigger>
                          <SelectContent>
                            {templates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedTemplate && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={handleSelectTemplate}
                          >
                            Load Template
                          </Button>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Rule Name</label>
                        <Input
                          value={ruleName}
                          onChange={(e) => setRuleName(e.target.value)}
                          placeholder="e.g., Use TypeScript for all new files"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Rule Content</label>
                        <Textarea
                          value={ruleContent}
                          onChange={(e) => setRuleContent(e.target.value)}
                          placeholder="Enter your rule content..."
                          rows={8}
                        />
                      </div>
                      <Button 
                        onClick={handleCreateRule} 
                        className="w-full"
                        disabled={isCreatingRule || isIndexingRule}
                      >
                        {isCreatingRule ? (
                          <>
                            <Loader2 className="size-4 animate-spin mr-2" />
                            Creating Rule...
                          </>
                        ) : isIndexingRule ? (
                          <>
                            <Loader2 className="size-4 animate-spin mr-2" />
                            Indexing Rule...
                          </>
                        ) : (
                          "Create Rule"
                        )}
                      </Button>
                      {isIndexingRule && (
                        <p className="text-sm text-muted-foreground text-center">
                          Your rule is being indexed in Pinecone for semantic search...
                        </p>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search rules..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchRules()}
                  />
                  <Button onClick={handleSearchRules}>
                    <Search className="size-4" />
                  </Button>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {rules.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No rules yet. Create your first rule!
                    </div>
                  ) : (
                    rules.map((rule) => (
                      <div key={rule.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{rule.name}</div>
                            <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {rule.content}
                            </div>
                            <div className="text-xs text-muted-foreground mt-2">
                              Version {rule.version}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sessions Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Code className="size-5" />
                  Coding Sessions
                </CardTitle>
                <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="size-4" />
                      New Session
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Session</DialogTitle>
                      <DialogDescription>
                        Start a new coding session with context-aware rules
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Session Title</label>
                        <Input
                          value={sessionTitle}
                          onChange={(e) => setSessionTitle(e.target.value)}
                          placeholder="e.g., Building authentication system"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Context</label>
                        <Textarea
                          value={sessionContext}
                          onChange={(e) => setSessionContext(e.target.value)}
                          placeholder="Describe what you're working on..."
                          rows={4}
                        />
                      </div>
                      <Button onClick={handleCreateSession} className="w-full">
                        Start Session
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sessions.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No active sessions. Start a new one!
                  </div>
                ) : (
                  sessions.map((session) => (
                    <div key={session.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{session.title}</div>
                          {session.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {session.description}
                            </div>
                          )}
                          {session.rules && session.rules.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-2">
                              {session.rules.length} relevant rule(s)
                            </div>
                          )}
                        </div>
                        {session.is_active && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEndSession(session.id)}
                          >
                            <Square className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </div>
  )
}
