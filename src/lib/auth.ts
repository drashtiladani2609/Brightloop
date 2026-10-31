import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"
import { prisma } from "@/lib/prisma"
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession, type SessionPayload } from "@/lib/jwt"
import type { Role } from "@/lib/constants"

export type SessionUser = SessionPayload & { id: string }

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = cookies().get(SESSION_COOKIE)?.value
  const payload = await verifySession(token)
  if (!payload?.sub) return null
  return { ...payload, id: payload.sub }
})

function cookieScope() {
  const proto = headers().get("x-forwarded-proto") ?? "http"
  const secure = proto === "https" || process.env.NODE_ENV === "production"
  return {
    httpOnly: true as const,
    sameSite: secure ? ("none" as const) : ("lax" as const),
    secure,
    partitioned: secure,
    path: "/"
  }
}

export async function createSessionCookie(payload: SessionPayload) {
  const token = await signSession(payload)
  cookies().set(SESSION_COOKIE, token, { ...cookieScope(), maxAge: SESSION_MAX_AGE })
}

export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, "", { ...cookieScope(), maxAge: 0 })
}

export async function getCurrentUser() {
  const session = await getSession()
  if (!session) return null
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      customer: { select: { id: true, name: true } }
    }
  })
  if (!user || !user.isActive) return null
  return user
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return user
}

export async function requireRole(roles: Role[]) {
  const user = await requireUser()
  if (!roles.includes(user.role as Role)) redirect("/dashboard?denied=1")
  return user
}

export async function requirePortalUser() {
  const user = await requireUser()
  if (user.role !== "CUSTOMER") redirect("/dashboard")
  return user
}

export const homeForRole = (role: string) => (role === "CUSTOMER" ? "/portal" : "/dashboard")
