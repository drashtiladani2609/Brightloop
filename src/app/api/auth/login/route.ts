import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { createSessionCookie, homeForRole } from "@/lib/auth"
import { ApiError, handleError, ok, parseBody } from "@/lib/api"
import { loginSchema } from "@/lib/validators"

export async function POST(request: Request) {
  try {
    const body = await parseBody(request, loginSchema)
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { customer: { select: { id: true, active: true } } }
    })
    if (!user) throw new ApiError("Email or password is wrong", 401)
    if (!user.isActive) throw new ApiError("This account is disabled. Ask an admin to enable it", 403)

    const valid = await bcrypt.compare(body.password, user.passwordHash)
    if (!valid) throw new ApiError("Email or password is wrong", 401)

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    await createSessionCookie({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "ADMIN",
      customerId: user.customer?.id ?? null
    })

    return ok({ role: user.role, redirect: homeForRole(user.role) })
  } catch (error) {
    return handleError(error)
  }
}
