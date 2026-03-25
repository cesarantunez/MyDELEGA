import { useRef, useEffect, useState, useCallback } from 'react'

interface PullToRefreshOptions {
  onRefresh: () => void | Promise<void>
  threshold?: number // pixels to pull before triggering
}

export function usePullToRefresh({ onRefresh, threshold = 80 }: PullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only trigger if scrolled to top
    if (window.scrollY > 0) return
    startY.current = e.touches[0].clientY
    setIsPulling(true)
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || isRefreshing) return
    const diff = e.touches[0].clientY - startY.current
    if (diff < 0) {
      setPullDistance(0)
      return
    }
    // Dampened pull
    const dampened = Math.min(diff * 0.5, threshold * 1.5)
    setPullDistance(dampened)
  }, [isPulling, isRefreshing, threshold])

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return
    setIsPulling(false)

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(threshold * 0.5) // Keep indicator visible
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: true })
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    isPastThreshold: pullDistance >= threshold,
  }
}
