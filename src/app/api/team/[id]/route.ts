import { prisma } from "@/lib/prisma"
import { ApiError, guard, handleError, ok, parseBody } from "@/lib/api"
import { z } from "zod"

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(["ADMIN", "STAFF"]).optional(),
  name: z.string().trim().min(2).max(80).optional()
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await guard(["ADMIN"])
    const body = await parseBody(request, patchSchema)
    if (params.id === admin.id && body.isActive === false) throw new ApiError("You cannot disable your own account", 409)
    if (params.id === admin.id && body.role === "STAFF") throw new ApiError("You cannot drop your own admin role", 409)

    const target = await prisma.user.findUnique({ where: { id: params.id } })
    if (!target || target.role === "CUSTOMER") throw new ApiError("Staff member not found", 404)

    const user = await prisma.user.update({
      where: { id: params.id },
      data: body,
      select: { id: true, name: true, email: true, role: true, isActive: true }
    })
    return ok(user)
  } catch (error) {
    return handleError(error)
  }
}
