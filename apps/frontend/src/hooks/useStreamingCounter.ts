import { useState, useEffect } from 'react'

/**
 * Shows real-time accumulated earnings based on round progress.
 *
 * The value represents how much has been earned from roundStart until now,
 * assuming linear distribution: earnedSoFar = totalReward × elapsed / duration.
 * This is deterministic — refreshing or opening on another device shows the
 * same value because it's anchored to the round start time, not page load.
 *
 * @param totalReward - Total estimated reward for the round (string ENS amount)
 * @param roundStartDate - ISO string of round start (e.g. "2026-03-01T00:00:00.000Z")
 * @param roundEndDate - ISO string of round end (e.g. "2026-04-01T00:00:00.000Z")
 * @param decimals - Decimal places to display (default 5)
 */
export function useStreamingCounter(
  totalReward: string,
  roundStartDate: string,
  roundEndDate: string,
  decimals = 5,
): string {
  const reward = parseFloat(totalReward)
  const startMs = new Date(roundStartDate).getTime()
  const endMs = new Date(roundEndDate).getTime()
  const durationMs = endMs - startMs

  const [display, setDisplay] = useState(() => {
    if (reward <= 0 || durationMs <= 0) return (0).toFixed(decimals)
    const elapsed = Math.max(0, Math.min(Date.now() - startMs, durationMs))
    return (reward * elapsed / durationMs).toFixed(decimals)
  })

  useEffect(() => {
    if (reward <= 0 || durationMs <= 0) return

    let raf: number

    function tick() {
      const now = Date.now()
      const elapsed = Math.max(0, Math.min(now - startMs, durationMs))
      const earned = reward * elapsed / durationMs
      setDisplay(earned.toFixed(decimals))
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reward, startMs, durationMs, decimals])

  return display
}
