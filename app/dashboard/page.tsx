"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { getUserRulesWithRepositories, updateRule, deleteRule } from "@/app/actions/rule_actions"
import { ExternalLink, Code, Calendar, Edit, Trash2, Loader2, Copy, Check } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface Repository {
  id: string
  name: string
  full_name: string
  owner: string
  language: string | null
  html_url: string
}

interface Rule {
  id: string
  name: string
  content: string
  version: number
  is_active: boolean
  repository_id: string | null
  created_at: Date
  updated_at: Date
  repository: Repository | null
}

export default function Dashboard() {
  const { user, isLoaded } = useUser()
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [editName, setEditName] = useState("")
  const [editContent, setEditContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function fetchRules() {
      if (!isLoaded) return

      if (!user) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const result = await getUserRulesWithRepositories()
        
        if (result.success && result.data) {
          setRules(result.data)
        } else {
          setError(result.error || "Failed to fetch rules")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchRules()
  }, [user, isLoaded])

  const handleRuleClick = (rule: Rule) => {
    setSelectedRule(rule)
    setIsEditDialogOpen(true)
    setEditingRule(rule)
    setEditName(rule.name)
    setEditContent(rule.content)
  }

  const handleEdit = async () => {
    if (!editingRule) return

    setIsSaving(true)
    try {
      const result = await updateRule({
        id: editingRule.id,
        name: editName,
        content: editContent,
      })

      if (result.success) {
        toast.success("Rule updated successfully")
        setIsEditDialogOpen(false)
        setSelectedRule(null)
        setEditingRule(null)
        // Refresh rules list
        const refreshResult = await getUserRulesWithRepositories()
        if (refreshResult.success && refreshResult.data) {
          setRules(refreshResult.data)
        }
      } else {
        toast.error(result.error || "Failed to update rule")
      }
    } catch (err) {
      toast.error("An error occurred while updating the rule")
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteClick = (rule: Rule, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedRule(rule)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedRule) return

    setIsDeleting(true)
    try {
      const result = await deleteRule(selectedRule.id)

      if (result.success) {
        toast.success("Rule deleted successfully")
        setIsDeleteDialogOpen(false)
        setSelectedRule(null)
        // Refresh rules list
        const refreshResult = await getUserRulesWithRepositories()
        if (refreshResult.success && refreshResult.data) {
          setRules(refreshResult.data)
        }
      } else {
        toast.error(result.error || "Failed to delete rule")
      }
    } catch (err) {
      toast.error("An error occurred while deleting the rule")
      console.error(err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCopyContent = async (content: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      toast.success("Copied to clipboard. Once you configure the MCP server, manual copying won't be needed.")
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error("Failed to copy content")
      console.error(err)
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex min-h-[calc(100vh-73px)] items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 pb-6 text-center">
              <p className="mb-4 text-sm sm:text-base">Please sign in to view your dashboard</p>
              <Link href="/sign-in" className="text-primary hover:underline text-sm sm:text-base">
                Sign In
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your coding rules</p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading rules...</span>
          </div>
        )}

        {error && (
          <Card className="mb-4 sm:mb-6 border-destructive">
            <CardContent className="pt-4 sm:pt-6">
              <p className="text-sm sm:text-base text-destructive">Error: {error}</p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && rules.length === 0 && (
          <Card>
            <CardContent className="pt-6 sm:pt-8 pb-6 sm:pb-8 text-center">
              <p className="text-sm sm:text-base text-muted-foreground">
                No rules found. Generate your first rule to get started.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && rules.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {rules.map((rule) => (
              <Card 
                key={rule.id} 
                className="flex flex-col hover:shadow-lg transition-all cursor-pointer border-border"
                onClick={() => handleRuleClick(rule)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base sm:text-lg font-semibold line-clamp-2 flex-1">
                      {rule.name}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 shrink-0"
                      onClick={(e) => handleDeleteClick(rule, e)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3 pt-0">
                  <div className="relative rounded-md overflow-hidden border border-border bg-muted/30 min-h-[80px] max-h-[120px]">
                    <div className="absolute top-0 left-0 w-8 h-full bg-muted/50 border-r border-border flex flex-col items-end pt-2 pr-1.5 text-[10px] text-muted-foreground font-mono select-none pointer-events-none z-10">
                      {Array.from({ length: Math.min(rule.content.split('\n').length, 5) }).map((_, i) => (
                        <div key={i} className="h-4 leading-4">
                          {i + 1}
                        </div>
                      ))}
                    </div>
                    <div className="pl-10 pr-2 py-2 overflow-y-auto max-h-[120px]">
                      <pre className="text-[10px] sm:text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                        {rule.content.split('\n').slice(0, 5).join('\n')}
                        {rule.content.split('\n').length > 5 && '\n...'}
                      </pre>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {rule.repository && (
                      <Badge variant="secondary" className="text-xs">
                        <Code className="size-3 mr-1" />
                        {rule.repository.full_name.split('/')[1]}
                      </Badge>
                    )}
                    <Badge variant={rule.is_active ? "default" : "outline"} className="text-xs">
                      {rule.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">v{rule.version}</Badge>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground pt-1">
                    <Calendar className="size-3 mr-1" />
                    {new Date(rule.created_at).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[90vh] flex flex-col p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit Rule</DialogTitle>
            <DialogDescription className="text-sm">
              Update your rule details. Changes will create a new version.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label htmlFor="rule-name" className="text-sm font-medium">Rule Name</Label>
              <Input
                id="rule-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter rule name"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="rule-content" className="text-sm font-medium">Rule Content</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => handleCopyContent(editContent)}
                >
                  {copied ? (
                    <>
                      <Check className="size-3 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="relative rounded-md overflow-hidden border border-border bg-muted/30">
                <div className="absolute top-0 left-0 w-10 h-full bg-muted/50 border-r border-border flex flex-col items-end pt-3 pr-2 text-xs text-muted-foreground font-mono select-none pointer-events-none z-10">
                  {Array.from({ length: Math.max(editContent.split('\n').length, 10) }).map((_, i) => (
                    <div key={i} className="h-6 leading-6">
                      {i + 1}
                    </div>
                  ))}
                </div>
                <Textarea
                  id="rule-content"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Enter rule content (Markdown supported)"
                  className="code-editor min-h-[200px] sm:min-h-[300px] font-mono text-xs sm:text-sm resize-none pl-12 pr-4 py-3 leading-6 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  spellCheck={false}
                  style={{ tabSize: 2 }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Supports Markdown syntax. Use <code className="px-1 py-0.5 bg-muted rounded text-xs font-mono">**bold**</code>, <code className="px-1 py-0.5 bg-muted rounded text-xs font-mono">`code`</code>, <code className="px-1 py-0.5 bg-muted rounded text-xs font-mono"># headings</code>, etc.
              </p>
            </div>
            {selectedRule && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                {selectedRule.repository && (
                  <Badge variant="secondary" className="text-xs">
                    <Code className="size-3 mr-1" />
                    <a
                      href={selectedRule.repository.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline flex items-center gap-1"
                    >
                      {selectedRule.repository.full_name}
                      <ExternalLink className="size-3" />
                    </a>
                  </Badge>
                )}
                <Badge variant={selectedRule.is_active ? "default" : "outline"} className="text-xs">
                  {selectedRule.is_active ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="outline" className="text-xs">v{selectedRule.version}</Badge>
                <span className="text-xs text-muted-foreground">
                  Created {new Date(selectedRule.created_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 pt-4 border-t">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setIsEditDialogOpen(false)
                setSelectedRule(null)
                setEditingRule(null)
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEdit} 
              disabled={isSaving || !editName.trim() || !editContent.trim()}
              className="w-full sm:w-auto"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Edit className="mr-2 size-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This action cannot be undone. This will permanently delete the rule
              {selectedRule && ` "${selectedRule.name}"`} and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isDeleting} className="w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

