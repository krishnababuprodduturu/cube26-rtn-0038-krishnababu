import { useEffect, useState, type ReactNode } from 'react'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Command,
  Download,
  FileCheck2,
  LayoutDashboard,
  Menu,
  Package,
  Plus,
  Search,
  Settings,
  Sun,
  Moon,
  Truck,
  X,
  type LucideIcon,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import CinematicOverview from './CinematicOverview'
import AmbientCanvas from './AmbientCanvas'
import { SessionProvider, useSession } from './lib/session'
import { BatchStoreProvider, useBatchStore } from './lib/store'
import { reviewQueue } from './lib/derive'
import { Pill, SafeImage } from './screens/shared'

import Dashboard from './screens/Dashboard'
import Returns from './screens/Returns'
import BatchUpload from './screens/BatchUpload'
import Inspection from './screens/Inspection'
import Reviews from './screens/Reviews'
import Catalogue from './screens/Catalogue'
import Passport from './screens/Passport'
import Evidence from './screens/Evidence'
import Analytics from './screens/Analytics'
import Integrations from './screens/Integrations'
import SettingsPage from './screens/Settings'

import './styles.css'

const navItems: { label: string; path: string; icon: LucideIcon; badgeKey?: 'queue' }[] = [
  { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Returns', path: '/returns', icon: Package },
  { label: 'New Inspection', path: '/returns/new', icon: Plus },
  { label: 'Review Queue', path: '/reviews', icon: ClipboardCheck, badgeKey: 'queue' },
  { label: 'Analytics', path: '/analytics', icon: Activity },
  { label: 'Catalogue', path: '/catalogue', icon: Boxes },
  { label: 'Evidence & Audit', path: '/evidence', icon: FileCheck2 },
  { label: 'Integrations', path: '/integrations', icon: Truck },
  { label: 'Settings', path: '/settings', icon: Settings },
]

function Shell({ children }: { children: ReactNode }) {
  const [mobile, setMobile] = useState(false)
  const [search, setSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [dark, setDark] = useState(true)
  const [toast, setToast] = useState('')
  const location = useLocation()
  const navigate = useNavigate()

  const {
    rows,
    inFlightJob,
    justCompletedJob,
    justFailedJob,
    dismissCompletedJob,
    dismissFailedJob,
    downloadOutput,
    setActiveJobId,
  } = useBatchStore()
  const queueCount = reviewQueue(rows).length
  const defaultUnitId = rows[0]?.unit_id || 'UNIT-0001'

  const title = (() => {
    const p = location.pathname
    if (p === '/dashboard') return 'Returns overview'
    if (p === '/returns/new') return 'New batch inspection'
    if (p.includes('/inspection')) return 'Inspection & evidence'
    if (p === '/returns') return 'Returns ledger'
    if (p === '/reviews') return 'Review queue'
    if (p === '/catalogue') return 'Product catalogue'
    if (p.startsWith('/units/')) return 'Unit digital passport'
    if (p === '/evidence') return 'Evidence & audit'
    if (p === '/analytics') return 'Analytics & trends'
    if (p === '/integrations') return 'Integrations'
    if (p === '/settings') return 'Settings'
    if (p === '/overview') return 'Overview'
    return 'Returns'
  })()

  const shellClass =
    location.pathname === '/overview'
      ? 'shell overview-shell'
      : dark
        ? 'shell dark dashboard-shell'
        : 'shell dashboard-shell'

  const q = searchQuery.trim().toLowerCase()
  const results = q
    ? rows.filter(
        (r) =>
          r.record_id.toLowerCase().includes(q) ||
          r.ordered_sku.toLowerCase().includes(q) ||
          r.order_id.toLowerCase().includes(q) ||
          r.unit_id.toLowerCase().includes(q) ||
          r.ordered_asin.toLowerCase().includes(q) ||
          r.operator_disposition.toLowerCase().includes(q),
      )
    : rows



  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchQuery('')
        setSearch((prev) => !prev)
      }
      if (event.key === 'Escape') {
        setSearch(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => setMobile(false), [location.pathname])

  const flash = (text: string) => {
    setToast(text)
    window.setTimeout(() => setToast(''), 2600)
  }

  return (
    <div className={shellClass}>
      {location.pathname !== '/overview' && <AmbientCanvas intensity={0.75} />}
      {mobile && <button className="scrim" onClick={() => setMobile(false)} aria-label="Close menu" />}

      {location.pathname !== '/overview' && (
        <>
          {/* ========================================================
              TIER 1: MODERN HORIZONTAL COMMAND NAVIGATION HEADER
             ======================================================== */}
          <header className="nexus-platform-header">
            <div className="nexus-header-left">
              <Link to="/overview" className="nexus-brand-link">
                <span className="nexus-mark">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="#06b6d4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 6L18 9.5V14.5L12 18L6 14.5V9.5L12 6Z" fill="rgba(6, 182, 212, 0.18)" stroke="#3b82f6" strokeWidth="1.2"/>
                    <circle cx="12" cy="12" r="2.5" fill="#06b6d4"/>
                  </svg>
                </span>
                <div className="nexus-brand-text">
                  <strong style={{ fontFamily: "'Outfit', 'Inter', sans-serif", fontSize: '15px', fontWeight: 700, letterSpacing: '0.03em' }}>
                    NEXUS<span style={{ color: '#06b6d4' }}>//RETURNS</span>
                  </strong>
                  <span className="nexus-version-pill">AI v2.4</span>
                </div>
              </Link>

              <button className="nexus-workspace-pill" onClick={() => navigate('/dashboard')} title="Operations HQ Node">
                <span className="nexus-ws-dot" />
                <span className="nexus-ws-name">Operations HQ</span>
                <ChevronDown size={12} className="nexus-ws-caret" />
              </button>
            </div>

            {/* Center Horizontal Nav Pills */}
            <nav className="nexus-header-nav">
              {navItems.map(({ label, path, icon: Icon, badgeKey }) => {
                const targetPath = label === 'Unit passports' ? `/units/${defaultUnitId}` : path
                const isActive =
                  path === '/returns'
                    ? location.pathname === '/returns' ||
                      (location.pathname.startsWith('/returns/') && !location.pathname.endsWith('/new') && !location.pathname.includes('/inspection'))
                    : location.pathname === path

                const isNew = path === '/returns/new'

                return (
                  <Link
                    key={label}
                    to={targetPath}
                    className={`nexus-nav-tab ${isActive ? 'active' : ''} ${isNew ? 'nexus-nav-tab-cta' : ''}`}
                    onClick={() => {
                      if (path === '/returns/new' && !inFlightJob) {
                        setActiveJobId(null)
                      }
                    }}
                  >
                    <Icon size={14} strokeWidth={isActive ? 2.2 : 1.8} />
                    <span>{label}</span>
                    {badgeKey === 'queue' && queueCount > 0 && (
                      <span className="nexus-nav-badge">{queueCount}</span>
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* Right Tools & Profile */}
            <div className="nexus-header-right">
              <button
                className="nexus-search-trigger"
                onClick={() => {
                  setSearchQuery('')
                  setSearch(true)
                }}
              >
                <Search size={13} />
                <span>Search...</span>
                <kbd><Command size={10} />K</kbd>
              </button>

              <Link
                to="/overview"
                className="nexus-console-btn"
                title="Launch Panoramic 3D Vision Console"
              >
                <Activity size={13} />
                <span>Console</span>
              </Link>

              <button
                className="nexus-tool-btn"
                onClick={() => {
                  if (queueCount > 0) {
                    navigate('/reviews')
                    flash(`${queueCount} item${queueCount === 1 ? '' : 's'} awaiting review`)
                  } else {
                    flash('All items reviewed · No pending alerts')
                  }
                }}
                aria-label="Notifications"
                title={queueCount > 0 ? `${queueCount} items in review queue` : 'No notifications'}
              >
                <Bell size={15} />
                {queueCount > 0 && <span className="nexus-bell-dot" />}
              </button>

              <button
                className="nexus-tool-btn"
                onClick={() => setDark(!dark)}
                aria-label="Toggle theme"
                title="Toggle theme"
              >
                {dark ? <Sun size={15} /> : <Moon size={15} />}
              </button>

              <button className="nexus-profile-pill" onClick={() => navigate('/settings')}>
                <span className="nexus-avatar-circ">OP</span>
                <span className="nexus-profile-role">Lead</span>
              </button>

              <button className="nexus-mobile-menu-btn" onClick={() => setMobile(true)} aria-label="Open Navigation">
                <Menu size={18} />
              </button>
            </div>
          </header>

          {/* TIER 2: TELEMETRY & CONTEXT SUB-BAR */}
          <div className="nexus-sub-bar">
            <div className="nexus-sub-left">
              <div className="nexus-crumb">
                <span>NEXUS</span>
                <ChevronRight size={11} />
                <span>Operations HQ</span>
                <ChevronRight size={11} />
                <b>{title}</b>
              </div>
            </div>

            <div className="nexus-sub-center">
              <div className="nexus-telemetry-badge">
                <span className="telemetry-pulse" />
                <span>RFC 8785 HASH CHAIN VERIFIED</span>
              </div>
              <span className="nexus-telemetry-sep">·</span>
              <span className="nexus-telemetry-stat">P95 LATENCY &lt; 1.2S</span>
              <span className="nexus-telemetry-sep">·</span>
              <span className="nexus-telemetry-stat">DETERMINISTIC PERCEPTION</span>
            </div>

            <div className="nexus-sub-right">
              <button className="nexus-sub-link" onClick={() => navigate('/returns')}>
                <Package size={12} />
                <span>Ledger ({rows.length})</span>
              </button>
              {queueCount > 0 && (
                <button className="nexus-sub-link alert-link" onClick={() => navigate('/reviews')}>
                  <ClipboardCheck size={12} />
                  <span>Review ({queueCount})</span>
                </button>
              )}
              <button className="nexus-sub-link" onClick={() => navigate(`/units/${defaultUnitId}`)}>
                <Boxes size={12} />
                <span>Unit Passport</span>
              </button>
            </div>
          </div>

          {/* Mobile Navigation Drawer */}
          {mobile && (
            <aside className="nexus-mobile-drawer">
              <div className="nexus-drawer-head">
                <div className="nexus-brand-text">
                  <strong style={{ fontFamily: "'Outfit', 'Inter', sans-serif", fontSize: '15px', fontWeight: 700 }}>
                    NEXUS<span style={{ color: '#06b6d4' }}>//RETURNS</span>
                  </strong>
                </div>
                <button className="icon-button" onClick={() => setMobile(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="nexus-drawer-links">
                {navItems.map(({ label, path, icon: Icon, badgeKey }) => (
                  <Link
                    key={label}
                    to={path}
                    className={`nexus-drawer-link ${location.pathname === path ? 'active' : ''}`}
                    onClick={() => setMobile(false)}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                    {badgeKey === 'queue' && queueCount > 0 && <span className="nexus-nav-badge">{queueCount}</span>}
                  </Link>
                ))}
              </div>
            </aside>
          )}
        </>
      )}

      {/* Panoramic Main Area */}
      <div className="nexus-main-area">
        {inFlightJob && location.pathname !== '/returns/new' && (
          <div className="inflight-banner">
            <div className="inflight-banner-left">
              <span className="inflight-pulse" />
              <span>
                <strong>Batch inspection running:</strong>{' '}
                <span className="inflight-filename">{inFlightJob.before_filename || 'batch CSV'}</span> ·{' '}
                <strong>{inFlightJob.processed} of {inFlightJob.total_rows}</strong> returns evaluated
                {inFlightJob.total_rows > 0
                  ? ` (${Math.min(100, Math.round(((inFlightJob.processed + inFlightJob.uncertain) / inFlightJob.total_rows) * 100))}%)`
                  : ''}
              </span>
            </div>
            <div className="inflight-banner-right">
              {inFlightJob.total_rows > 0 && (
                <div className="inflight-mini-bar">
                  <div
                    className="inflight-mini-fill"
                    style={{
                      width: `${Math.max(5, Math.min(100, Math.round(((inFlightJob.processed + inFlightJob.uncertain) / inFlightJob.total_rows) * 100)))}%`,
                    }}
                  />
                </div>
              )}
              <button
                className="button primary inflight-action-btn"
                onClick={() => navigate('/returns/new')}
              >
                View live progress <ArrowRight size={13} />
              </button>
            </div>
          </div>
        )}

        {justCompletedJob && location.pathname !== '/returns/new' && (
          <div className="inflight-banner completed">
            <div className="inflight-banner-left">
              <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
              <span>
                <strong>Batch inspection completed:</strong>{' '}
                {justCompletedJob.total_rows} returns evaluated successfully.
              </span>
            </div>
            <div className="inflight-banner-right">
              <button
                className="button"
                onClick={() => void downloadOutput(justCompletedJob.job_id)}
              >
                <Download size={13} /> Download output CSV
              </button>
              <button
                className="button primary inflight-action-btn"
                onClick={() => {
                  dismissCompletedJob()
                  navigate('/returns')
                }}
              >
                View in Returns <ArrowRight size={13} />
              </button>
              <button
                className="icon-button"
                onClick={dismissCompletedJob}
                title="Dismiss"
                style={{ width: 28, height: 28 }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {justFailedJob && location.pathname !== '/returns/new' && (
          <div
            className="inflight-banner"
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              borderColor: 'rgba(239, 68, 68, 0.35)',
            }}
          >
            <div className="inflight-banner-left">
              <CircleAlert size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
              <span>
                <strong style={{ color: '#fca5a5' }}>Batch inspection notice:</strong>{' '}
                {justFailedJob.error || 'The uploaded file could not be parsed as a valid returns batch.'}
              </span>
            </div>
            <div className="inflight-banner-right">
              <button
                className="button primary inflight-action-btn"
                style={{ background: '#ef4444', borderColor: '#ef4444', color: '#fff' }}
                onClick={() => {
                  dismissFailedJob()
                  setActiveJobId(null)
                  navigate('/returns/new')
                }}
              >
                Review & re-upload <ArrowRight size={13} />
              </button>
              <button
                className="icon-button"
                onClick={dismissFailedJob}
                title="Dismiss"
                style={{ width: 28, height: 28 }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.main
            className="page"
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {search && (
          <motion.div
            className="overlay search-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setSearch(false)
            }}
          >
            <motion.div className="search-modal">
              <div className="search-input">
                <Search size={19} />
                <input
                  autoFocus
                  placeholder="Search returns, products, orders, units..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                <kbd>ESC</kbd>
              </div>
              <div className="search-results">
                <small>{searchQuery ? 'MATCHING RETURNS' : 'RECENT RETURNS'}</small>
                {results.slice(0, 7).map((record) => (
                  <button
                    key={record.record_id}
                    onClick={() => {
                      navigate(`/returns/${record.record_id}/inspection`)
                      setSearch(false)
                    }}
                  >
                    <SafeImage src={record.image || record.reference_image} fallbackSize={20} />
                    <span>
                      <b>{record.ordered_sku}</b>
                      <small>
                        {record.record_id} · {record.order_id} · {record.unit_id}
                      </small>
                    </span>
                    <Pill value={record.status} />
                    <ArrowUpRight size={15} />
                  </button>
                ))}
                {results.length === 0 && (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: '#8da296', fontSize: 13 }}>
                    No matching return records found.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <CheckCircle2 size={16} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Gate() {
  const { connected } = useSession()

  return (
    <BrowserRouter>
      <Routes>
        {/* Intro / Sign-In page (normal, single-viewport, no-scroll) */}
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<CinematicOverview />} />
        <Route path="/signin" element={<Navigate to="/overview" replace />} />
        <Route path="/login" element={<Navigate to="/overview" replace />} />

        {/* Protected workspace routes */}
        <Route
          path="/*"
          element={
            !connected ? (
              <CinematicOverview />
            ) : (
              <BatchStoreProvider>
                <Shell>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/returns" element={<Returns />} />
                    <Route path="/returns/new" element={<BatchUpload />} />
                    <Route path="/batch" element={<Navigate to="/returns/new" replace />} />
                    <Route path="/returns/:id/inspection" element={<Inspection />} />
                    <Route path="/reviews" element={<Reviews />} />
                    <Route path="/catalogue" element={<Catalogue />} />
                    <Route path="/units/:id" element={<Passport />} />
                    <Route path="/evidence" element={<Evidence />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/integrations" element={<Integrations />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/overview" replace />} />
                  </Routes>
                </Shell>
              </BatchStoreProvider>
            )
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <SessionProvider>
      <Gate />
    </SessionProvider>
  )
}
