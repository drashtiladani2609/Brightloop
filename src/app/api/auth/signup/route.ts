import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { createSessionCookie } from "@/lib/auth"
import { ApiError, handleError, ok, parseBody } from "@/lib/api"
import { signupSchema } from "@/lib/validators"

export async function POST(request: Request) {
  try {
    const body = await parseBody(request, signupSchema)
    const existing = await prisma.user.findUnique({ where: { email: body.email } })
    if (existing) throw new ApiError("That email already has an account", 409)

    const passwordHash = await bcrypt.hash(body.password, 10)
    const customerEmailTaken = await prisma.customer.findUnique({ where: { email: body.email } })

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email: body.email, name: body.name, passwordHash, role: "CUSTOMER" }
      })
      if (!customerEmailTaken) {
        await tx.customer.create({
          data: {
            name: body.company?.trim() || body.name,
            contactName: body.name,
            email: body.email,
            userId: created.id,
            notes: "Self signup from marketing site"
          }
        })
      } else {
        await tx.customer.update({ where: { id: customerEmailTaken.id }, data: { userId: created.id } })
      }
      return created
    })

    await createSessionCookie({ sub: user.id, email: user.email, name: user.name, role: "CUSTOMER" })
    return ok({ id: user.id, role: user.role, redirect: "/portal" })
  } catch (error) {
    return handleError(error)
  }
}
