import { useState, useEffect, type ReactNode, type CSSProperties } from 'react'
import { Info, Package, type LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

export function SafeImage({
  src,
  alt = '',
  className = '',
  style,
  fallbackSize = 20,
}: {
  src?: string | null
  alt?: string
  className?: string
  style?: CSSProperties
  fallbackSize?: number
}) {
  const [useProxy, setUseProxy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setUseProxy(false)
    setFailed(false)
  }, [src])

  const cleanedSrc = src ? src.trim().replace(/^["']|["']$/g, '') : null

  if (!cleanedSrc || failed) {
    return (
      <span className={`image-fallback ${className}`} style={style} aria-label={alt || 'No image'}>
        <Package size={fallbackSize} strokeWidth={1.5} />
      </span>
    )
  }

  const finalSrc = useProxy
    ? `/api/v1/batch/photos/proxy?url=${encodeURIComponent(cleanedSrc)}`
    : cleanedSrc

  return (
    <img
      src={finalSrc}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        if (!useProxy && cleanedSrc.startsWith('http')) {
          setUseProxy(true)
        } else {
          setFailed(true)
        }
      }}
    />
  )
}

export function Header({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string
  title: string
  subtitle: string
  actions?: ReactNode
}) {
  return (
    <div className="page-header">
      <div className="header-meta">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {actions && <div className="header-actions">{actions}</div>}
    </div>
  )
}

export function Button({
  children,
  icon: Icon,
  primary = false,
  onClick,
  disabled = false,
  className = '',
}: {
  children: ReactNode
  icon?: LucideIcon
  primary?: boolean
  onClick?: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      disabled={disabled}
      className={`button ${primary ? 'primary' : 'secondary'} ${className}`}
      onClick={onClick}
    >
      {Icon && <Icon size={14} strokeWidth={1.8} />}
      <span>{children}</span>
    </button>
  )
}

export function Pill({ value }: { value: string }) {
  const norm = value.toLowerCase().replaceAll(' ', '-').replaceAll('·', '')
  return (
    <span className={`pill ${norm}`}>
      <span className="pill-dot" />
      <span>{value}</span>
    </span>
  )
}

export function Metric({
  label,
  value,
  note,
  icon: Icon,
  tone = 'default',
  index = 0,
}: {
  label: string
  value: string
  note: string
  icon: LucideIcon
  tone?: string
  index?: number
}) {
  return (
    <motion.div
      className={`metric-tile tone-${tone}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        <span className={`metric-icon ${tone}`}>
          <Icon size={15} strokeWidth={1.8} />
        </span>
      </div>
      <div className="metric-body">
        <span className="metric-value">{value}</span>
        <span className="metric-note">{note}</span>
      </div>
    </motion.div>
  )
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="system-note">
      <Info size={14} className="note-icon" />
      <span>{children}</span>
    </div>
  )
}

export function InlineError({ children }: { children: ReactNode }) {
  return <div className="inline-error">{children}</div>
}
