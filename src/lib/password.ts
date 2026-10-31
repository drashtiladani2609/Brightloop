export const passwordChecks = (value: string) => ({
  length: value.length > 8,
  upper: /[A-Z]/.test(value),
  lower: /[a-z]/.test(value),
  special: /[^A-Za-z0-9]/.test(value)
})

export function isStrongPassword(value: string) {
  const c = passwordChecks(value)
  return c.length && c.upper && c.lower && c.special
}

export function passwordScore(value: string) {
  const c = passwordChecks(value)
  return Object.values(c).filter(Boolean).length
}
