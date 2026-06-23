import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return "http://localhost:3000"
}

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: "Inky Gigachad — Local MCP Memory for Cursor, Claude Code & Codex",
    template: "%s | Inky Gigachad",
  },
  description:
    "Local-first MCP server for AI coding tools. Save coding rules and memory once in ~/.inky-gigachad and reuse across Cursor, Claude Code, Codex, and Windsurf. No cloud, no API keys.",
  keywords: [
    "MCP",
    "Model Context Protocol",
    "Cursor MCP",
    "Claude Code MCP",
    "Codex MCP",
    "Windsurf MCP",
    "coding memory",
    "local-first",
    "AI coding assistant",
    "developer tools",
    "inky-gigachad",
  ],
  authors: [{ name: "Inky Gigachad" }],
  openGraph: {
    title: "Inky Gigachad — Local MCP Memory for AI Coding Tools",
    description:
      "npx -y inky-gigachad mcp — share coding memory across Cursor, Claude Code, Codex, and Windsurf. 100% local.",
    type: "website",
    siteName: "Inky Gigachad",
  },
  twitter: {
    card: "summary_large_image",
    title: "Inky Gigachad — Local MCP Memory",
    description: "One local memory file. Every AI coding IDE. No cloud required.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        elements: {
          formButtonPrimary: "bg-primary hover:bg-primary/90",
          footerActionLink: "text-primary hover:text-primary/90",
        },
      }}
    >
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
          <Toaster />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
