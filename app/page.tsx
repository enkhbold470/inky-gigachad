"use client"

import Link from "next/link"    
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Github, Plus, Settings } from "lucide-react"
import { Header } from "@/components/header"

export default function Home() {

  const { user, isLoaded } = useUser() // Clerk user

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
              AI-powered coding rules from your GitHub repos and docs. Keep your code consistently <b>you</b>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link href={isLoaded && user ? "/onboard" : "/sign-up"}>
                  <Plus className="mr-2 size-5" />
                  Create New Account & Generate Rules
                </Link>
              </Button>
              {isLoaded && user ? (
                <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
                  <Link href="/dashboard">
                    <Settings className="mr-2 size-5" />
                    Manage Dashboard & Rules
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
                  <Link href="/sign-in">
                    <Github className="mr-2 size-5" />
                    Sign In to Manage Rules
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <Carousel className="w-full mt-6">
              <CarouselContent>
                <CarouselItem>
                  <div className="rounded-lg overflow-hidden border border-border">
                    <img src="/demo1.gif" alt="Repository Analysis" className="w-full h-auto" />
                    <div className="p-3 text-center text-sm font-medium border-t border-border">Repository Analysis</div>
                  </div>
                </CarouselItem>
                <CarouselItem>
                  <div className="rounded-lg overflow-hidden border border-border">
                    <img src="/demo2.gif" alt="Rule Generation" className="w-full h-auto" />
                    <div className="p-3 text-center text-sm font-medium border-t border-border">Rule Generation</div>
                  </div>
                </CarouselItem>
                <CarouselItem>
                  <div className="rounded-lg overflow-hidden border border-border">
                    <img src="/demo3.gif" alt="Rule Management" className="w-full h-auto" />
                    <div className="p-3 text-center text-sm font-medium border-t border-border">Rule Management</div>
                  </div>
                </CarouselItem>
                <CarouselItem>
                  <div className="rounded-lg overflow-hidden border border-border">
                    <img src="/demo4.gif" alt="MCP Integration" className="w-full h-auto" />
                    <div className="p-3 text-center text-sm font-medium border-t border-border">MCP Integration</div>
                  </div>
                </CarouselItem>
              </CarouselContent>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </Carousel>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
