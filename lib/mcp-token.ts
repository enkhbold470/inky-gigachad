import { randomBytes } from "crypto"

/**
 * Generate a secure MCP access token
 * Format: inky_<base64url encoded random bytes>
 */
export function generateMCPToken(): string {
  // Generate 32 random bytes (256 bits)
  const randomBytesBuffer = randomBytes(32)
  // Convert to base64url encoding (URL-safe, no padding)
  const base64url = randomBytesBuffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
  
  return `inky_${base64url}`
}

/**
 * Hash a token for storage
 * Using SHA-256 for hashing (stored in database)
 * Note: For production, consider using bcrypt or similar for better security
 */
export function hashToken(token: string): string {
  const crypto = require("crypto")
  return crypto.createHash("sha256").update(token).digest("hex")
}

/**
 * Verify a token against a hash
 */
export function verifyToken(token: string, hash: string): boolean {
  const tokenHash = hashToken(token)
  return tokenHash === hash
}

