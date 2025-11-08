"use client"

import { UserButton, useUser } from "@clerk/nextjs"
import { Github } from "lucide-react"
import Link from "next/link"

export function Header() {
  const { user, isLoaded } = useUser()

  if (!isLoaded) {
    return null
  }

  return (
    <header className="border-b bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="size-8 bg-primary rounded-md flex items-center justify-center">
              <Github className="size-5 text-primary-foreground" />
            </div>
            <span className="font-mono text-xl font-semibold">Inky</span>
          </Link>

          <div className="flex items-center gap-4">
            {user && (
              <>
                <div className="text-sm text-muted-foreground">
                  {user.primaryEmailAddress?.emailAddress}
                </div>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "size-8",
                    },
                  }}
                  afterSignOutUrl="/sign-in"
                />
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

