"use client"

import { useEffect, useState, useCallback } from "react"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/header"
import { getRepositories } from "@/app/actions/random"
import { saveRepositories } from "@/app/actions/repo_actions"
import { createRule } from "@/app/actions/rule_actions"
import { getPublicTemplates } from "@/app/actions/template_actions"
import { Github, ThumbsUp, Copy, CheckCircle2, ArrowRight, Loader2 } from "lucide-react"
import type { GitHubRepo } from "@/lib/github"
import type { RuleTemplate } from "@/lib/types"
import { toast } from "sonner"

type TabValue = "repositories" | "rules" | "tools"

export default function Dashboard() {
  const { user, isLoaded } = useUser()
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([])
  const [selectedRepos, setSelectedRepos] = useState<Set<number>>(new Set())
  const [templates, setTemplates] = useState<RuleTemplate[]>([])
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set())
  const [selectedTool, setSelectedTool] = useState<string>("")
  const [activeTab, setActiveTab] = useState<TabValue>("repositories")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [generatedRule, setGeneratedRule] = useState<string>("")
  const [generatingRules, setGeneratingRules] = useState(false)

  const loadData = useCallback(async () => {
    if (!isLoaded || !user) return

    setLoading(true)
    try {
      const reposResult = await getRepositories()
      if (reposResult.success && reposResult.data) {
        setGithubRepos(reposResult.data)
      }

      const templatesResult = await getPublicTemplates()
      if (templatesResult.success && templatesResult.data) {
        setTemplates(templatesResult.data)
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [isLoaded, user])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRepoToggle = (repoId: number) => {
    const newSelected = new Set(selectedRepos)
    if (newSelected.has(repoId)) {
      newSelected.delete(repoId)
    } else {
      newSelected.add(repoId)
    }
    setSelectedRepos(newSelected)
  }

  const handleNextTab = async () => {
    if (activeTab === "repositories") {
      if (selectedRepos.size === 0) {
        toast.error("Please select at least one repository")
        return
      }
      await handleSaveRepositoriesAndGenerateRules()
    } else if (activeTab === "rules") {
      setActiveTab("tools")
    } else if (activeTab === "tools") {
      handleFinish()
    }
  }

  const handleSaveRepositoriesAndGenerateRules = async () => {
    setGeneratingRules(true)
    try {
      const reposToSave = githubRepos.filter((repo) => selectedRepos.has(repo.id))
      const result = await saveRepositories(reposToSave)
      
      if (result.success && result.data?.generatedRule) {
        setGeneratedRule(result.data.generatedRule.content)
        toast.success("Repositories saved and rules generated!")
        setActiveTab("rules")
      } else {
        toast.error(result.error || "Failed to save repositories")
      }
    } catch (error) {
      console.error("Error saving repositories:", error)
      toast.error("Failed to save repositories")
    } finally {
      setGeneratingRules(false)
    }
  }

  const handleTemplateToggle = (templateId: string) => {
    const newSelected = new Set(selectedTemplates)
    if (newSelected.has(templateId)) {
      newSelected.delete(templateId)
    } else {
      newSelected.add(templateId)
    }
    setSelectedTemplates(newSelected)
  }

  const handleTemplateThumbsUp = () => {
    toast.success("Thanks for your feedback!")
  }

  const handleCopyMCPCode = () => {
    const mcpCode = `{
  "mcpServers": {
    "inky-rules": {
      "type": "http",
      "url": "https://api.inky.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`
    navigator.clipboard.writeText(mcpCode)
    toast.success("MCP server code copied to clipboard!")
  }

  const handleFinish = async () => {
    if (!selectedTool) {
      toast.error("Please select a coding tool")
      return
    }

    setSaving(true)
    try {
      // Repositories are already saved, just create rules from selected templates

      // Create rules from selected templates
      for (const templateId of selectedTemplates) {
        const template = templates.find((t) => t.id === templateId)
        if (template) {
          await createRule({
            name: template.name,
            content: template.content,
          })
        }
      }

      setShowSuccess(true)
    } catch (error) {
      console.error("Error finishing setup:", error)
      toast.error("Failed to complete setup")
    } finally {
      setSaving(false)
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

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <Header />
        <div className="flex min-h-[calc(100vh-73px)] items-center justify-center p-6">
          <Card className="max-w-md w-full text-center">
            <CardContent className="pt-6 pb-6">
              <div className="flex flex-col items-center gap-4">
                <div className="size-16 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle2 className="size-10 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                    You are all set!
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Your coding style stays the same across all IDE, CLI tools
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
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
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Setup Your Coding Memory</h1>
            <p className="text-muted-foreground">Configure your personalized coding rules in 3 simple steps</p>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="repositories">1. Repositories</TabsTrigger>
              <TabsTrigger value="rules">2. Rules</TabsTrigger>
              <TabsTrigger value="tools">3. Tools</TabsTrigger>
            </TabsList>

            {/* Tab 1: Repository Selection */}
            <TabsContent value="repositories">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Github className="size-5" />
                    Select Repositories
                  </CardTitle>
                  <CardDescription>
                    Choose the repositories you want to analyze for coding patterns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {githubRepos.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        No repositories found. Make sure you&apos;re connected to GitHub.
                      </div>
                    ) : (
                      githubRepos.map((repo) => (
                        <div
                          key={repo.id}
                          className={`flex items-center gap-3 p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors ${
                            selectedRepos.has(repo.id) ? "bg-accent border-primary" : ""
                          }`}
                          onClick={() => handleRepoToggle(repo.id)}
                        >
                          <Checkbox
                            checked={selectedRepos.has(repo.id)}
                            onCheckedChange={() => handleRepoToggle(repo.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          {repo.language && (
                            <Badge variant="outline" className="text-xs shrink-0 min-w-[60px] justify-center">
                              {repo.language}
                            </Badge>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{repo.full_name}</div>
                            {repo.description && (
                              <div className="text-sm text-muted-foreground truncate mt-1">
                                {repo.description}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground mt-1">
                              ⭐ {repo.stargazers_count} {repo.private && "• 🔒 Private"}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button 
                      onClick={handleNextTab} 
                      disabled={selectedRepos.size === 0 || generatingRules || saving}
                    >
                      {generatingRules ? (
                        <>
                          <Loader2 className="size-4 animate-spin mr-2" />
                          Generating Rules...
                        </>
                      ) : (
                        <>
                          Next: Rules <ArrowRight className="size-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: Rules Selection */}
            <TabsContent value="rules">
              <Card>
                <CardHeader>
                  <CardTitle>Select Rules</CardTitle>
                  <CardDescription>
                    Choose rules from industry leaders or use your auto-generated rules
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Auto-generated Rules */}
                  {generatedRule && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold mb-3">Your Auto-Generated Rules</h3>
                      <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="pt-4">
                          <pre className="text-sm whitespace-pre-wrap font-mono">{generatedRule}</pre>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                  
                  {!generatedRule && (
                    <div className="mb-6 text-center text-muted-foreground text-sm py-4">
                      Select repositories in the previous step to generate rules
                    </div>
                  )}

                  {/* Template Rules */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Rules from Industry Leaders</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                      {templates.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8 col-span-2">
                          No templates available
                        </div>
                      ) : (
                        templates.map((template) => (
                          <Card
                            key={template.id}
                            className={`cursor-pointer hover:border-primary transition-colors ${
                              selectedTemplates.has(template.id) ? "border-primary bg-primary/5" : ""
                            }`}
                            onClick={() => handleTemplateToggle(template.id)}
                          >
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Checkbox
                                      checked={selectedTemplates.has(template.id)}
                                      onCheckedChange={() => handleTemplateToggle(template.id)}
                                    />
                                    <h4 className="font-medium">{template.name}</h4>
                                  </div>
                                  {template.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {template.description}
                                    </p>
                                  )}
                                  {template.category && (
                                    <Badge variant="secondary" className="mt-2 text-xs">
                                      {template.category}
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleTemplateThumbsUp()
                                  }}
                                >
                                  <ThumbsUp className="size-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between">
                    <Button variant="outline" onClick={() => setActiveTab("repositories")}>
                      Back
                    </Button>
                    <Button onClick={handleNextTab}>
                      Next: Tools <ArrowRight className="size-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 3: Tool Selection */}
            <TabsContent value="tools">
              <Card>
                <CardHeader>
                  <CardTitle>Connect with Your Coding Tool</CardTitle>
                  <CardDescription>
                    Select your preferred IDE or coding tool and copy the MCP server configuration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {["Windsurf", "Cursor", "Claude Code", "CodeX"].map((tool) => (
                        <Button
                          key={tool}
                          variant={selectedTool === tool ? "default" : "outline"}
                          className="h-auto py-4 flex flex-col gap-2"
                          onClick={() => setSelectedTool(tool)}
                        >
                          <span className="text-lg">{tool}</span>
                        </Button>
                      ))}
                    </div>

                    {selectedTool && (
                      <Card className="mt-4">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">MCP Server Configuration</CardTitle>
                            <Button size="sm" onClick={handleCopyMCPCode}>
                              <Copy className="size-4 mr-2" />
                              Copy
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
{`{
  "mcpServers": {
    "inky-rules": {
      "type": "http",
      "url": "https://api.inky.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`}
                          </pre>
                          <p className="text-xs text-muted-foreground mt-2">
                            Paste this into your {selectedTool} MCP configuration file
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  <div className="mt-6 flex justify-between">
                    <Button variant="outline" onClick={() => setActiveTab("rules")}>
                      Back
                    </Button>
                    <Button onClick={handleFinish} disabled={!selectedTool || saving}>
                      {saving ? "Saving..." : "Finish Setup"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
