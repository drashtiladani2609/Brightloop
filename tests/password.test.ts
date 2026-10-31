import { describe, expect, it } from "vitest"
import { isStrongPassword, passwordChecks, passwordScore } from "../src/lib/password"

describe("password rules", () => {
  it("accepts a password with nine chars upper lower and special", () => {
    expect(isStrongPassword("Bright@123")).toBe(true)
  })

  it("rejects eight chars even when every class is there", () => {
    expect(isStrongPassword("Brigh@12")).toBe(false)
    expect(passwordChecks("Brigh@12").length).toBe(false)
  })

  it("rejects a missing uppercase or lowercase letter", () => {
    expect(isStrongPassword("bright@123")).toBe(false)
    expect(isStrongPassword("BRIGHT@123")).toBe(false)
  })

  it("rejects a password with no special char", () => {
    expect(isStrongPassword("Bright1234")).toBe(false)
    expect(passwordChecks("Bright1234").special).toBe(false)
  })

  it("scores each satisfied rule", () => {
    expect(passwordScore("")).toBe(0)
    expect(passwordScore("Bright@123")).toBe(4)
    expect(passwordScore("bright123")).toBe(2)
  })
})
