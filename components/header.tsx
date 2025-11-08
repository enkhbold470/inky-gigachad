"use client"

import { UserButton, useUser } from "@clerk/nextjs"
import Link from "next/link"
import Image from "next/image"

export function Header() {
  const { user, isLoaded } = useUser()

  if (!isLoaded) {
    return null
  }

  return (
    <header className="border-b bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-mono text-2xl font-semibold">
            {/* <Image
              src="/logo.jpg"
              alt="Inky"
              width={32}
              height={32}
              className="header-logo"
            /> */}
            Inky
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

