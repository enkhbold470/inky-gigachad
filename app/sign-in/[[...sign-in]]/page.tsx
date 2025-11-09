import { SignIn } from "@clerk/nextjs"
import Image from "next/image"

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Image
            src="/logo.jpg"
            alt="Inky"
            width={40}
            height={40}
            className="sign-in-logo"
            style={{ width: "auto", height: "auto" }}
          />
          <span className="font-mono text-2xl font-semibold">Inky</span>
        </div>
        <p className="text-sm text-muted-foreground max-w-md">
          Sign in to access your coding memory layer and personalized rules
        </p>
      </div>
      
      <SignIn
        appearance={{
          elements: {
            formButtonPrimary: "bg-primary hover:bg-primary/90",
            footerActionLink: "text-primary hover:text-primary/90",
          },
        }}
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        redirectUrl="/"
      />
    </div>
  )
}

