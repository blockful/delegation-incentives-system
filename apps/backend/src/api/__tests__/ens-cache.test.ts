import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  getCachedEnsName,
  getCachedAvatarUrl,
  prefetchEnsNames,
  setCachedEnsName,
  clearEnsCache,
} from "../ens-cache.js"

// We need to reset module-level state between tests
beforeEach(() => {
  clearEnsCache()
  vi.stubGlobal("fetch", vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const mockFetch = (response: object | null, ok = true) => {
  vi.mocked(fetch).mockResolvedValue({
    ok,
    json: async () => response,
  } as Response)
}

describe("getCachedEnsName", () => {
  it("returns null when address is not in cache", () => {
    expect(getCachedEnsName("0xabc")).toBeNull()
  })

  it("returns the cached name when present", () => {
    setCachedEnsName("0xABC", "alice.eth")
    expect(getCachedEnsName("0xabc")).toBe("alice.eth")
  })

  it("is case-insensitive (normalises to lowercase)", () => {
    setCachedEnsName("0xabc", "alice.eth")
    expect(getCachedEnsName("0xABC")).toBe("alice.eth")
    expect(getCachedEnsName("0xAbc")).toBe("alice.eth")
  })

  it("returns null when cached name is null", () => {
    setCachedEnsName("0xabc", null)
    expect(getCachedEnsName("0xabc")).toBeNull()
  })
})

describe("prefetchEnsNames", () => {
  it("does nothing when given an empty array", async () => {
    await prefetchEnsNames([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it("skips addresses that are already in cache (fresh)", async () => {
    setCachedEnsName("0xabc", "alice.eth")
    await prefetchEnsNames(["0xabc"])
    expect(fetch).not.toHaveBeenCalled()
  })

  it("resolves a name from the API and populates the cache", async () => {
    mockFetch({ name: "alice.eth" })
    await prefetchEnsNames(["0xabc"])
    expect(getCachedEnsName("0xabc")).toBe("alice.eth")
  })

  it("caches null when the API returns no name field", async () => {
    mockFetch({ records: {} }) // no `name` key
    await prefetchEnsNames(["0xabc"])
    expect(getCachedEnsName("0xabc")).toBeNull()
  })

  it("caches null when the API responds with non-ok status", async () => {
    mockFetch(null, false)
    await prefetchEnsNames(["0xabc"])
    expect(getCachedEnsName("0xabc")).toBeNull()
  })

  it("caches null on network error and does not throw", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network failure"))
    await expect(prefetchEnsNames(["0xabc"])).resolves.toBeUndefined()
    expect(getCachedEnsName("0xabc")).toBeNull()
  })

  it("resolves multiple addresses in parallel batches", async () => {
    mockFetch({ name: "alice.eth" })
    const addresses = ["0xaaa", "0xbbb", "0xccc"]
    await prefetchEnsNames(addresses)
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it("does not re-fetch fresh cached addresses when called again", async () => {
    mockFetch({ name: "alice.eth" })
    await prefetchEnsNames(["0xabc"])
    await prefetchEnsNames(["0xabc"])
    // Should only have been called once (second call hits fresh cache)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("per spec: calls the EFP ENS API endpoint for the address", async () => {
    mockFetch({ name: "alice.eth" })
    await prefetchEnsNames(["0xABC123"])
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("/users/0xABC123/ens"),
      expect.any(Object),
    )
  })
})

describe("getCachedAvatarUrl", () => {
  it("returns null when address is not in cache", () => {
    expect(getCachedAvatarUrl("0xabc")).toBeNull()
  })

  it("returns the cached avatar URL when present", () => {
    setCachedEnsName("0xabc", "alice.eth", "https://example.com/avatar.png")
    expect(getCachedAvatarUrl("0xabc")).toBe("https://example.com/avatar.png")
  })

  it("returns null when avatar is not set", () => {
    setCachedEnsName("0xabc", "alice.eth")
    expect(getCachedAvatarUrl("0xabc")).toBeNull()
  })

  it("is case-insensitive", () => {
    setCachedEnsName("0xabc", "alice.eth", "https://example.com/avatar.png")
    expect(getCachedAvatarUrl("0xABC")).toBe("https://example.com/avatar.png")
  })
})

describe("setCachedEnsName", () => {
  it("stores a name that getCachedEnsName can retrieve", () => {
    setCachedEnsName("0xdead", "vitalik.eth")
    expect(getCachedEnsName("0xdead")).toBe("vitalik.eth")
  })

  it("overwrites an existing entry", () => {
    setCachedEnsName("0xdead", "old.eth")
    setCachedEnsName("0xdead", "new.eth")
    expect(getCachedEnsName("0xdead")).toBe("new.eth")
  })
})
