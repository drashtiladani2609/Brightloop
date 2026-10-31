import { createHash, randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"
import { handleError, ok, parseBody } from "@/lib/api"
import { forgotSchema } from "@/lib/validators"
import { resetEmailTemplate, sendMail } from "@/server/services/mailer"
import { smtpConfigured } from "@/server/config"

export async function POST(request: Request) {
  try {
    const { email } = await parseBody(request, forgotSchema)
    const user = await prisma.user.findUnique({ where: { email } })

    let devLink: string | null = null

    if (user) {
      const raw = randomBytes(32).toString("hex")
      const tokenHash = createHash("sha256").update(raw).digest("hex")
      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) }
      })
      const link = `${process.env.APP_URL || "http://localhost:3000"}/reset-password?token=${raw}`
      await sendMail({
        to: user.email,
        subject: "Reset your Brightloop password",
        html: resetEmailTemplate(link, user.name),
        type: "PASSWORD_RESET"
      })
      if (!smtpConfigured) devLink = link
    }

    return ok({
      message: "If that email is registered a reset link is on its way",
      devLink
    })
  } catch (error) {
    return handleError(error)
  }
}
