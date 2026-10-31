import { prisma } from "@/lib/prisma"
import { guard, handleError, ok, parseBody } from "@/lib/api"
import { customerSchema } from "@/lib/validators"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await guard(["ADMIN", "STAFF"])
    const body = await parseBody(request, customerSchema.partial())
    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: {
        name: body.name,
        contactName: body.contactName,
        email: body.email,
        phone: body.phone ?? undefined,
        addressLine: body.addressLine ?? undefined,
        city: body.city ?? undefined,
        country: body.country ?? undefined,
        taxId: body.taxId ?? undefined,
        notes: body.notes ?? undefined,
        active: body.active
      }
    })
    return ok(customer)
  } catch (error) {
    return handleError(error)
  }
}
