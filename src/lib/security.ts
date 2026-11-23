import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'aegis-forvica-fallback-secret-change-in-prod';
const JWT_KEY = new TextEncoder().encode(JWT_SECRET_STRING);

export interface SessionPayload {
  userId: string;
  schoolId: string;
  role: string;
  inviteCode?: string;
  [key: string]: any;
}

/**
 * Hash a plain password using bcrypt (10 rounds)
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

/**
 * Verify a plain password against a stored hash (or legacy plaintext).
 * If stored starts with $2a$ or $2b$, compare via bcrypt.
 * If stored is plaintext, verify exact match and return needsRehash: true.
 */
export async function verifyPassword(
  plain: string,
  stored: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!plain || !stored) {
    return { valid: false, needsRehash: false };
  }

  const isBcrypt = stored.startsWith('$2a$') || stored.startsWith('$2b$');
  if (isBcrypt) {
    try {
      const match = await bcrypt.compare(plain, stored);
      return { valid: match, needsRehash: false };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }

  // Legacy plaintext match
  const match = plain === stored;
  return { valid: match, needsRehash: match };
}

/**
 * Sign a compact HS256 JWT containing session identity
 */
export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    schoolId: payload.schoolId,
    role: payload.role,
    inviteCode: payload.inviteCode,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_KEY);
}

/**
 * Verify a compact HS256 JWT session token
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_KEY, {
      algorithms: ['HS256'],
    });
    return {
      userId: payload.userId as string,
      schoolId: payload.schoolId as string,
      role: payload.role as string,
      inviteCode: payload.inviteCode as string | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * In-memory sliding-window rate limiter
 * Returns { allowed: boolean, remainingAttempts: number, retryAfterSeconds?: number }
 */
interface RateLimitEntry {
  attempts: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Periodic cleanup of stale entries every 15 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      entry.attempts = entry.attempts.filter((ts) => now - ts < 600000); // 10 min window
      if (entry.attempts.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, 900000);
}

export function checkRateLimit(
  key: string,
  maxAttempts: number = 8,
  windowMs: number = 600000 // 10 minutes default
): { allowed: boolean; remainingAttempts: number; retryAfterSeconds?: number } {
  const now = Date.now();
  let entry = rateLimitStore.get(key);

  if (!entry) {
    entry = { attempts: [] };
    rateLimitStore.set(key, entry);
  }

  // Filter timestamps within current window
  entry.attempts = entry.attempts.filter((ts) => now - ts < windowMs);

  if (entry.attempts.length >= maxAttempts) {
    const oldest = entry.attempts[0];
    const retryAfterSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
    };
  }

  return {
    allowed: true,
    remainingAttempts: maxAttempts - entry.attempts.length,
  };
}

export function recordRateLimitAttempt(
  key: string,
  windowMs: number = 600000
): void {
  const now = Date.now();
  let entry = rateLimitStore.get(key);
  if (!entry) {
    entry = { attempts: [] };
    rateLimitStore.set(key, entry);
  }
  entry.attempts = entry.attempts.filter((ts) => now - ts < windowMs);
  entry.attempts.push(now);
}

export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key);
}
