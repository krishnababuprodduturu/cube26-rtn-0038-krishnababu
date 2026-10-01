import { useEffect, useRef } from 'react'

interface AmbientCanvasProps {
  intensity?: number
  className?: string
}

/**
 * Enterprise Atmospheric Surface
 * Ultra-subtle, non-distracting background depth with restrained radial lighting
 * and fine geometric noise texture. Zero CPU drain, zero glow slop.
 */
export default function AmbientCanvas({
  intensity = 0.5,
  className = '',
}: AmbientCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let width = 0
    let height = 0

    const render = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height

      ctx.clearRect(0, 0, width, height)

      // 1. Subtle top-center ambient gradient (Cyber Orange & Warm Amber)
      const topGrad = ctx.createRadialGradient(
        width * 0.5, 0, 0,
        width * 0.5, 0, Math.max(width * 0.6, 600)
      )
      topGrad.addColorStop(0, `rgba(255, 107, 0, ${0.08 * intensity})`)
      topGrad.addColorStop(0.45, `rgba(255, 170, 0, ${0.035 * intensity})`)
      topGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = topGrad
      ctx.fillRect(0, 0, width, height)

      // 2. Subtle bottom-right ambient accent (Warm Sunset Amber)
      const botGrad = ctx.createRadialGradient(
        width * 0.85, height * 0.9, 0,
        width * 0.85, height * 0.9, 500
      )
      botGrad.addColorStop(0, `rgba(255, 120, 0, ${0.05 * intensity})`)
      botGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = botGrad
      ctx.fillRect(0, 0, width, height)
    }

    render()
    window.addEventListener('resize', render)

    return () => {
      window.removeEventListener('resize', render)
    }
  }, [intensity])

  return (
    <canvas
      ref={canvasRef}
      className={`ambient-canvas ${className}`}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.9,
      }}
      aria-hidden="true"
    />
  )
}
