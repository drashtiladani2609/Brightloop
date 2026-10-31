import { SignJWT, jwtVerify } from "jose"
import type { Role } from "@/lib/constants"

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "brightloop-dev-secret-change-me-9f3a7c1b")

export type SessionPayload = {
  sub: string
  email: string
  name: string
  role: Role
  customerId?: string | null
}

export const SESSION_COOKIE = "brightloop_session"
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret)
}

export async function verifySession(token?: string | null): Promise<SessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}
