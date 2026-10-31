import { getSession } from "@/lib/auth"
import { ok, fail } from "@/lib/api"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getSession()
  if (!session) return fail("No session", 401)
  return ok({ role: session.role, name: session.name, email: session.email })
}
