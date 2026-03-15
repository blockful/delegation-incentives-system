import { useState, useEffect, useRef } from 'react'

/**
 * Animates a number incrementing in real-time based on a per-second rate.
 * Like Superfluid's streaming counter — shows earnings growing live.
 *
 * @param monthlyAmount - Monthly reward in ENS (string, e.g. "12.3456")
 * @param decimals - Number of decimal places to display (default 8 for visible ticking)
 * @returns The current animated value as a string
 */
export function useStreamingCounter(monthlyAmount: string, decimals = 8): string {
  const perSecond = parseFloat(monthlyAmount) / (30 * 24 * 3600)
  const startTimeRef = useRef(Date.now())
  const startValueRef = useRef(parseFloat(monthlyAmount))
  const [display, setDisplay] = useState(
    parseFloat(monthlyAmount).toFixed(decimals),
  )

  useEffect(() => {
    startTimeRef.current = Date.now()
    startValueRef.current = parseFloat(monthlyAmount)
  }, [monthlyAmount])

  useEffect(() => {
    if (perSecond <= 0) return

    let raf: number

    function tick() {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      const current = startValueRef.current + elapsed * perSecond
      setDisplay(current.toFixed(decimals))
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [perSecond, decimals])

  return display
}
