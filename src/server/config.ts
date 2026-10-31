export const appUrl = process.env.APP_URL || "http://localhost:3000"

export const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER)

export const currency = "USD"
