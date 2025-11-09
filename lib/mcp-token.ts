import { randomBytes, createCipheriv, createDecipheriv, createHash } from "crypto"

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
 * Get encryption key from environment variable
 * Falls back to a default key if not set (for development only)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.MCP_TOKEN_ENCRYPTION_KEY || "default-dev-key-32-bytes-long!!"
  // Ensure key is exactly 32 bytes for AES-256
  const keyBuffer = Buffer.from(key.padEnd(32, "0").slice(0, 32), "utf8")
  return keyBuffer
}

/**
 * Encrypt a token for storage (can be decrypted later)
 * Uses AES-256-GCM for authenticated encryption
 */
export function encryptToken(token: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(16) // Initialization vector
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  
  let encrypted = cipher.update(token, "utf8", "hex")
  encrypted += cipher.final("hex")
  
  const authTag = cipher.getAuthTag()
  
  // Combine IV + authTag + encrypted data
  // Format: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`
}

/**
 * Decrypt a token from storage
 */
export function decryptToken(encryptedToken: string): string {
  const key = getEncryptionKey()
  const parts = encryptedToken.split(":")
  
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format")
  }
  
  const [ivHex, authTagHex, encrypted] = parts
  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")
  
  const decipher = createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")
  
  return decrypted
}

/**
 * Hash a token for storage (one-way, cannot be retrieved)
 * Using SHA-256 for hashing (stored in database)
 * Note: For production, consider using bcrypt or similar for better security
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/**
 * Verify a token against a hash
 */
export function verifyToken(token: string, hash: string): boolean {
  const tokenHash = hashToken(token)
  return tokenHash === hash
}

