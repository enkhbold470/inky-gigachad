"use client"

import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Github, Plus, Settings, Terminal, Copy, CheckCircle2 } from "lucide-react"
import { Header } from "@/components/header"
import { useState } from "react"
import { toast } from "sonner"

const MCP_CONFIG = `{
  "mcpServers": {
    "inky": {
      "command": "npx",
      "args": ["-y", "inky-gigachad", "mcp"]
    }
  }
}`

const FEATURES = [
  {
    title: "Cross-IDE memory",
    description: "Save preferences once, reuse in Cursor, Claude Code, Codex, and Windsurf.",
  },
  {
    title: "100% local",
    description: "Memory lives in ~/.inky-gigachad/memory.json on your machine. No vector DB.",
  },
  {
    title: "One-line install",
    description: "npx -y inky-gigachad mcp — no API keys, no signup for the CLI.",
  },
  {
    title: "Import existing rules",
    description: "Pulls AGENTS.md, CLAUDE.md, and .cursor/rules into shared memory.",
  },
]

export default function Home() {
  const { user, isLoaded } = useUser()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(MCP_CONFIG)
    setCopied(true)
    toast.success("MCP config copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <Header />
      <main className="page-landing mx-auto max-w-4xl py-14 px-4">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="secondary">MCP</Badge>
              <Badge variant="secondary">Local-first</Badge>
              <Badge variant="secondary">Cursor · Claude Code · Codex</Badge>
            </div>
            <CardTitle className="text-3xl font-bold">
              <span className="text-primary">Inky Gigachad</span>
              <span className="block font-mono text-base text-muted-foreground mt-2">
                Local memory layer for AI coding tools
              </span>
            </CardTitle>
            <CardDescription className="mt-4 max-w-2xl text-lg">
              Share coding rules and project memory across every MCP-compatible IDE.
              One JSON file on your machine — no Pinecone, no OpenAI, no cloud.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="install-block mb-6">
              <div className="install-block-header">
                <Terminal className="size-4" />
                <span>Quick start</span>
              </div>
              <code className="install-block-command">npx -y inky-gigachad mcp</code>
            </div>

            <Card className="mb-6">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-sm">MCP config (copy into Cursor / Claude Code)</CardTitle>
                  <Button size="sm" variant="outline" onClick={handleCopy}>
                    {copied ? <CheckCircle2 className="size-4 mr-2" /> : <Copy className="size-4 mr-2" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="mcp-config-preview">{MCP_CONFIG}</pre>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link href={isLoaded && user ? "/onboard" : "/sign-up"}>
                  <Plus className="mr-2 size-5" />
                  {isLoaded && user ? "Open Dashboard" : "Sign Up for Web Dashboard"}
                </Link>
              </Button>
              {isLoaded && user ? (
                <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
                  <Link href="/dashboard">
                    <Settings className="mr-2 size-5" />
                    Manage Rules
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
                  <Link href="/sign-in">
                    <Github className="mr-2 size-5" />
                    Sign In
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="feature-grid mb-8">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <CardTitle className="text-base">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">How it works</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="how-it-works-list">
              <li>Add the MCP config to your IDE (Cursor, Claude Code, Codex, or Windsurf).</li>
              <li>Ask your agent to run <code>import_project_rules</code> in your repo.</li>
              <li>Save durable prefs with <code>save_memory</code> — they sync via ~/.inky-gigachad.</li>
              <li>Switch tools anytime. Same memory file, same context.</li>
            </ol>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
