import { NextResponse } from "next/server"
import { ZodError, type ZodSchema } from "zod"
import { getCurrentUser } from "@/lib/auth"
import type { Role } from "@/lib/constants"
import { ApiError } from "@/lib/errors"

export type ApiHandlerContext = { params: Record<string, string> }

export { ApiError } from "@/lib/errors"

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init)
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status })
}

export async function guard(roles?: Role[]) {
  const user = await getCurrentUser()
  if (!user) throw new ApiError("You must sign in first", 401)
  if (roles && roles.length && !roles.includes(user.role as Role)) {
    throw new ApiError("You are not allowed to do that", 403)
  }
  return user
}

export async function parseBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    throw new ApiError("Body must be valid json", 400)
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    throw new ApiError(`${first.path.join(".") || "input"}: ${first.message}`, 422)
  }
  return parsed.data
}

export function handleError(error: unknown) {
  if (error instanceof ApiError) return fail(error.message, error.status)
  if (error instanceof ZodError) return fail(error.issues[0]?.message ?? "Invalid input", 422)
  const message = error instanceof Error ? error.message : "Something went wrong"
  if (message.includes("Unique constraint")) return fail("That record already exist", 409)
  console.error("[api]", message)
  return fail(message, 500)
}

export function csvResponse(filename: string, rows: (string | number | null | undefined)[][]) {
  const escape = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const body = rows.map((r) => r.map(escape).join(",")).join("\n")
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  })
}
