"use client"

import Link from "next/link"
import Image from "next/image"

export function EmergentLogo() {
  return (
    <Link
      href="https://emergent.sh"
      target="_blank"
      rel="noopener noreferrer"
      className="emergent-logo"
      aria-label="Emergent.sh"
    >
      <Image
        src="/logo.jpg"
        alt="Emergent"
        width={80}
        height={32}
        className="emergent-logo-image"
        style={{ width: "auto", height: "auto" }}
      />
    </Link>
  )
}

