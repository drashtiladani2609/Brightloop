import { describe, expect, it } from "vitest"
import { canTransition, resolveTransition } from "../src/server/services/subscriptions"
import { ApiError } from "../src/lib/errors"

describe("subscription status transitions", () => {
  it("walks the happy path", () => {
    expect(canTransition("DRAFT", "QUOTATION")).toBe(true)
    expect(canTransition("QUOTATION", "CONFIRMED")).toBe(true)
    expect(canTransition("CONFIRMED", "ACTIVE")).toBe(true)
    expect(canTransition("ACTIVE", "CLOSED")).toBe(true)
  })

  it("allows pausing and resuming", () => {
    expect(canTransition("ACTIVE", "PAUSED")).toBe(true)
    expect(canTransition("PAUSED", "ACTIVE")).toBe(true)
  })

  it("blocks skipping steps", () => {
    expect(canTransition("DRAFT", "ACTIVE")).toBe(false)
    expect(canTransition("DRAFT", "CONFIRMED")).toBe(false)
    expect(canTransition("CLOSED", "ACTIVE")).toBe(false)
  })

  it("throws a readable error on an illegal jump", () => {
    expect(() => resolveTransition("DRAFT", "ACTIVATE")).toThrow(ApiError)
    expect(() => resolveTransition("DRAFT", "ACTIVATE")).toThrow(/Cannot go from DRAFT to ACTIVE/)
  })

  it("keeps closed subscriptions read only", () => {
    expect(() => resolveTransition("CLOSED", "PAUSE")).toThrow(/read only/)
  })
})
