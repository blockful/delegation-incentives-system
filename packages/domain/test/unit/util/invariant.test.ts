import { describe, it, expect } from "vitest"
import { invariant, InvariantViolationError } from "@/util/invariant.js"

describe("invariant", () => {
  it("does not throw when condition is true", () => {
    expect(() => invariant(true, "msg")).not.toThrow()
  })

  it("throws InvariantViolationError when condition is false", () => {
    expect(() => invariant(false, "msg")).toThrow(InvariantViolationError)
  })

  it("error message contains 'Invariant violation: msg'", () => {
    expect(() => invariant(false, "msg")).toThrow("Invariant violation: msg")
  })

  it("error is an instance of InvariantViolationError", () => {
    let caught: unknown
    try {
      invariant(false, "test message")
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(InvariantViolationError)
  })

  it("error .name is 'InvariantViolationError'", () => {
    let caught: unknown
    try {
      invariant(false, "test")
    } catch (e) {
      caught = e
    }
    expect((caught as Error).name).toBe("InvariantViolationError")
  })

  it("error message includes the provided message text", () => {
    expect(() => invariant(false, "custom error text")).toThrow("custom error text")
  })
})

describe("InvariantViolationError", () => {
  it("is an instance of Error", () => {
    const err = new InvariantViolationError("test")
    expect(err).toBeInstanceOf(Error)
  })

  it("has the correct name", () => {
    const err = new InvariantViolationError("test")
    expect(err.name).toBe("InvariantViolationError")
  })

  it("formats the message correctly", () => {
    const err = new InvariantViolationError("something failed")
    expect(err.message).toBe("Invariant violation: something failed")
  })
})
