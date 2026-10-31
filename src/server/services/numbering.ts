import type { Prisma, PrismaClient } from "@prisma/client"

type Db = PrismaClient | Prisma.TransactionClient

export async function nextSequence(db: Db, key: string) {
  const counter = await db.counter.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } }
  })
  return counter.value
}

export async function nextSubscriptionNumber(db: Db, date = new Date()) {
  const seq = await nextSequence(db, `sub-${date.getFullYear()}`)
  return `SUB-${date.getFullYear()}-${String(seq).padStart(5, "0")}`
}

export async function nextInvoiceNumber(db: Db, date = new Date()) {
  const seq = await nextSequence(db, `inv-${date.getFullYear()}`)
  return `INV-${date.getFullYear()}-${String(seq).padStart(5, "0")}`
}
