import nodemailer from "nodemailer"
import { prisma } from "@/lib/prisma"
import { smtpConfigured } from "@/server/config"

type MailInput = {
  to: string
  subject: string
  html: string
  type?: string
  invoiceId?: string | null
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null

function getTransporter() {
  if (!smtpConfigured) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    })
  }
  return transporter
}

export async function sendMail(input: MailInput) {
  const tx = getTransporter()
  let status = "LOGGED"
  if (tx) {
    try {
      await tx.sendMail({
        from: process.env.SMTP_FROM || "billing@brightloop.app",
        to: input.to,
        subject: input.subject,
        html: input.html
      })
      status = "SENT"
    } catch (error) {
      status = "FAILED"
      console.warn("[mail] send failed", error instanceof Error ? error.message : error)
    }
  } else {
    console.info(`[mail:dev] to=${input.to} subject=${input.subject}`)
    if (input.type === "PASSWORD_RESET") console.info(`[mail:dev] body=${input.html.replace(/<[^>]+>/g, " ").trim()}`)
  }

  return prisma.emailLog.create({
    data: {
      to: input.to,
      subject: input.subject,
      body: input.html,
      type: input.type ?? "INVOICE",
      invoiceId: input.invoiceId ?? null,
      status
    }
  })
}

export function resetEmailTemplate(link: string, name: string) {
  return `<div style="font-family:Inter,Arial,sans-serif">
    <h2>Reset your Brightloop password</h2>
    <p>Hi ${name}, use the link below to pick a new password. The link works once and expires in 60 minutes.</p>
    <p><a href="${link}" style="background:#6d28d9;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none">Reset password</a></p>
    <p>Or paste this url in your browser<br/>${link}</p>
  </div>`
}

export function invoiceEmailTemplate(opts: {
  customerName: string
  invoiceNumber: string
  total: string
  dueDate: string
  link: string
}) {
  return `<div style="font-family:Inter,Arial,sans-serif">
    <h2>Invoice ${opts.invoiceNumber}</h2>
    <p>Hi ${opts.customerName}, your invoice for ${opts.total} is due on ${opts.dueDate}.</p>
    <p><a href="${opts.link}" style="background:#6d28d9;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none">View invoice</a></p>
  </div>`
}

export function reminderEmailTemplate(opts: { customerName: string; invoiceNumber: string; total: string; dueDate: string; daysOverdue: number }) {
  return `<div style="font-family:Inter,Arial,sans-serif">
    <h2>Friendly reminder for ${opts.invoiceNumber}</h2>
    <p>Hi ${opts.customerName}, invoice ${opts.invoiceNumber} for ${opts.total} was due on ${opts.dueDate} and is ${opts.daysOverdue} days overdue.</p>
    <p>Please clear it at your earliest convenience</p>
  </div>`
}
