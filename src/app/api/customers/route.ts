import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { ApiError, guard, handleError, ok, parseBody } from "@/lib/api"
import { customerSchema } from "@/lib/validators"

export async function GET(request: Request) {
  try {
    await guard(["ADMIN", "STAFF"])
    const q = new URL(request.url).searchParams.get("q")?.trim()
    const customers = await prisma.customer.findMany({
      where: q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {},
      orderBy: { name: "asc" },
      take: 20,
      select: { id: true, name: true, email: true }
    })
    return ok(customers)
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: Request) {
  try {
    await guard(["ADMIN", "STAFF"])
    const body = await parseBody(request, customerSchema)
    const taken = await prisma.customer.findUnique({ where: { email: body.email } })
    if (taken) throw new ApiError("A customer with that email already exist", 409)

    const customer = await prisma.$transaction(async (tx) => {
      let userId: string | null = null
      if (body.createPortalLogin) {
        const existingUser = await tx.user.findUnique({ where: { email: body.email } })
        if (existingUser) throw new ApiError("That email is already used by another account", 409)
        const user = await tx.user.create({
          data: {
            email: body.email,
            name: body.contactName,
            role: "CUSTOMER",
            passwordHash: await bcrypt.hash("Customer@1234", 10)
          }
        })
        userId = user.id
      }
      return tx.customer.create({
        data: {
          name: body.name,
          contactName: body.contactName,
          email: body.email,
          phone: body.phone || null,
          addressLine: body.addressLine || null,
          city: body.city || null,
          country: body.country || null,
          taxId: body.taxId || null,
          notes: body.notes || null,
          active: body.active ?? true,
          userId
        }
      })
    })

    return ok(customer, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
