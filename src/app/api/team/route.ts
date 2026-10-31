import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { ApiError, guard, handleError, ok, parseBody } from "@/lib/api"
import { staffSchema } from "@/lib/validators"

export async function POST(request: Request) {
  try {
    await guard(["ADMIN"])
    const body = await parseBody(request, staffSchema)
    const existing = await prisma.user.findUnique({ where: { email: body.email } })
    if (existing) throw new ApiError("That email is already registered", 409)

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        role: body.role,
        passwordHash: await bcrypt.hash(body.password, 10)
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true }
    })
    return ok(user, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
