import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { EmergentLogo } from "@/components/emergent-logo";
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
  title: "Inky - Memory Layer for Personalized Coding",
  description: "Personalized coding memory layer with GitHub integration",
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
  openGraph: {
    images: ["/logo.jpg"],
  },
  twitter: {
    card: "summary",
    images: ["/logo.jpg"],
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
          <EmergentLogo />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
