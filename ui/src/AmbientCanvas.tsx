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

      // 1. Subtle top-center ambient gradient (Electric Cyan & Deep Indigo)
      const topGrad = ctx.createRadialGradient(
        width * 0.5, 0, 0,
        width * 0.5, 0, Math.max(width * 0.6, 600)
      )
      topGrad.addColorStop(0, `rgba(6, 182, 212, ${0.09 * intensity})`)
      topGrad.addColorStop(0.35, `rgba(59, 130, 246, ${0.045 * intensity})`)
      topGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = topGrad
      ctx.fillRect(0, 0, width, height)

      // 2. Subtle bottom-right ambient accent (Deep Royal Violet)
      const botGrad = ctx.createRadialGradient(
        width * 0.85, height * 0.9, 0,
        width * 0.85, height * 0.9, 550
      )
      botGrad.addColorStop(0, `rgba(99, 102, 241, ${0.06 * intensity})`)
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
