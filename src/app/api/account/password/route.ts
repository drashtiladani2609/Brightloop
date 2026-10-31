import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, guard, handleError, ok, parseBody } from "@/lib/api"
import { passwordSchema } from "@/lib/validators"

const schema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema
})

export async function POST(request: Request) {
  try {
    const user = await guard()
    const body = await parseBody(request, schema)
    const record = await prisma.user.findUnique({ where: { id: user.id } })
    if (!record) throw new ApiError("Account not found", 404)

    const valid = await bcrypt.compare(body.currentPassword, record.passwordHash)
    if (!valid) throw new ApiError("Current password is wrong", 401)

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(body.newPassword, 10) }
    })
    return ok({ message: "Password updated" })
  } catch (error) {
    return handleError(error)
  }
}
