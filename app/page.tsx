"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Github, ArrowRight } from "lucide-react"
import { Header } from "@/components/header"

export default function Home() {
  const router = useRouter()

  return (
    <div>
      <Header />
      <main className="page-landing mx-auto max-w-3xl py-14 px-4">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-3xl font-bold flex items-center gap-2">
              <span className="text-primary">Inky</span>
              <span className="font-mono text-base text-muted-foreground">| Memory Layer for Personalized Coding</span>
            </CardTitle>
            <CardDescription className="mt-4 max-w-xl text-lg">
              Inky analyzes your GitHub repositories and markdown docs to generate AI-powered, deeply personalized coding rules.
              Keep your code consistently <b>you</b>—everywhere you code.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="mb-4 space-y-2 text-base">
              <li>
                <b>• Repository Analysis:</b> Connect &amp; analyze your GitHub repos for coding styles and patterns.
              </li>
              <li>
                <b>• Intelligent Rule Generation:</b> AI generates coding standards using repo and Markdown context.
              </li>
              <li>
                <b>• Rule Management:</b> Organize, version, and search your rules in a snap.
              </li>
              <li>
                <b>• Coding Sessions:</b> In-context rules for every coding session, tracked and analyzed.
              </li>
              <li>
                <b>• MCP Server Integration:</b> Connect with tools like Windsurf, Cursor, Claude Code, and more.
              </li>
            </ul>
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <Button size="lg" className="w-full sm:w-auto" onClick={() => router.push("/sign-in")}>
                <Github className="mr-2 size-5" />
                Sign in with GitHub
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={() => router.push("/onboard")}>
                <ArrowRight className="mr-2 size-5" />
                Try Demo
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal ml-6 space-y-2 text-base">
              <li>
                <b>Connect GitHub:</b> Secure login &amp; repo selection.
              </li>
              <li>
                <b>Analyze &amp; Process:</b> Inky scans your code and Markdown files for patterns.
              </li>
              <li>
                <b>AI Rule Generation:</b> GPT-4 turns your patterns and docs into actionable rules.
              </li>
              <li>
                <b>Integrate Everywhere:</b> Access your coding preferences across all your tools with MCP.
              </li>
            </ol>
            <div className="mt-6 text-muted-foreground text-sm">
              <p>
                Open Source • TypeScript, Next.js, Clerk, Pinecone, OpenAI • <a href="https://github.com" className="hover:underline" target="_blank" rel="noopener">GitHub Repo</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
