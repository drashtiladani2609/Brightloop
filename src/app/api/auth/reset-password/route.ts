import bcrypt from "bcryptjs"
import { createHash } from "crypto"
import { prisma } from "@/lib/prisma"
import { ApiError, handleError, ok, parseBody } from "@/lib/api"
import { resetSchema } from "@/lib/validators"

export async function POST(request: Request) {
  try {
    const body = await parseBody(request, resetSchema)
    const tokenHash = createHash("sha256").update(body.token).digest("hex")
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } })

    if (!record) throw new ApiError("That reset link is not valid", 400)
    if (record.usedAt) throw new ApiError("That reset link was already used", 409)
    if (record.expiresAt.getTime() < Date.now()) throw new ApiError("That reset link has expired", 410)

    const passwordHash = await bcrypt.hash(body.password, 10)
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } })
    ])

    return ok({ message: "Password updated. You can sign in now" })
  } catch (error) {
    return handleError(error)
  }
}
