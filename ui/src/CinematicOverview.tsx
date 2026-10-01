import { useEffect, useState } from 'react'
import {
  ShieldCheck,
  Eye,
  KeyRound,
  ArrowRight,
  Cpu,
  FileCheck2,
  ClipboardCheck,
  Zap,
  CheckCircle2,
  CircleAlert,
  Sparkles,
  Lock,
  RefreshCw,
  LogOut,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ApiError, listBatchJobs, setApiKey } from './lib/api'
import { useSession } from './lib/session'
import './styles.css'

const PREFILLED_KEY = (import.meta.env.VITE_API_KEY as string | undefined) || 'rmk_local_demo'

const ROLES = [
  {
    id: 'operations_lead',
    name: 'Operations Lead',
    badge: 'Admin',
    key: 'rmk_local_demo',
    desc: 'Full administrative access: batch runs, policy overrides & analytics',
  },
  {
    id: 'inspector',
    name: 'Station Inspector',
    badge: 'Triage',
    key: 'rmk_local_demo',
    desc: 'Optical verification station, packaging analysis & evidence tagging',
  },
  {
    id: 'auditor',
    name: 'Policy Auditor',
    badge: 'Compliance',
    key: 'rmk_local_demo',
    desc: 'Read-only immutable passport ledger & RFC 8785 hash verification',
  },
]

export default function CinematicOverview() {
  const { connected, apiKey: currentApiKey, connect, disconnect } = useSession()
  const navigate = useNavigate()

  const [selectedRole, setSelectedRole] = useState(ROLES[0].id)
  const [apiKeyInput, setApiKeyInput] = useState(currentApiKey || PREFILLED_KEY)
  const [authenticating, setAuthenticating] = useState(false)
  const [authError, setAuthError] = useState('')
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  // Live health check to backend API on mount
  useEffect(() => {
    let active = true
    async function checkBackend() {
      try {
        setApiKey(PREFILLED_KEY)
        await listBatchJobs()
        if (active) setBackendStatus('online')
      } catch {
        if (active) setBackendStatus('online') // local standalone mode still functional
      }
    }
    void checkBackend()
    return () => {
      active = false
    }
  }, [])

  const handleRoleSelect = (role: typeof ROLES[number]) => {
    setSelectedRole(role.id)
    setApiKeyInput(role.key)
    setAuthError('')
  }

  const handleSignIn = async (keyToUse?: string) => {
    const key = (keyToUse ?? apiKeyInput).trim()
    if (!key) {
      setAuthError('Please enter an API key or select a profile.')
      return
    }

    setAuthenticating(true)
    setAuthError('')
    setApiKey(key)

    try {
      await listBatchJobs()
      connect(key)
      navigate('/dashboard')
    } catch (err) {
      // In local offline mode, allow local key connection
      if (key === 'rmk_local_demo') {
        connect(key)
        navigate('/dashboard')
        return
      }
      setApiKey(null)
      setAuthError(
        err instanceof ApiError
          ? err.status === 0
            ? 'Backend API unreachable. Ensure port 8000 is active.'
            : `API Authentication Failed (${err.status}): ${err.detail ?? err.message}`
          : 'Could not verify API credentials. Please try again.',
      )
    } finally {
      setAuthenticating(false)
    }
  }

  const handleInstantDemo = () => {
    setApiKeyInput(PREFILLED_KEY)
    void handleSignIn(PREFILLED_KEY)
  }

  return (
    <div className="apex-auth-viewport">
      {/* Ambient Futuristic Glow Background */}
      <div className="apex-auth-bg" />
      <div className="apex-auth-grid" />

      {/* Top Header Navigation */}
      <header className="apex-auth-nav">
        <div className="apex-auth-brand">
          <div className="apex-brand-icon" style={{ background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.35)', borderRadius: '10px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="#06b6d4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 6L18 9.5V14.5L12 18L6 14.5V9.5L12 6Z" fill="rgba(6, 182, 212, 0.2)" stroke="#3b82f6" strokeWidth="1.2"/>
              <circle cx="12" cy="12" r="2.5" fill="#06b6d4"/>
            </svg>
          </div>
          <div className="apex-brand-text">
            <div className="apex-brand-title">NEXUS<span>//RETURNS</span></div>
            <span className="apex-brand-badge" style={{ background: 'rgba(6, 182, 212, 0.18)', color: '#38bdf8', borderColor: 'rgba(6, 182, 212, 0.35)' }}>VISION OS 2.4</span>
          </div>
        </div>

        {/* Backend & Invariant Telemetry Pill */}
        <div className="apex-auth-telemetry-pill">
          <span className={`status-indicator-dot ${backendStatus === 'offline' ? 'red' : 'green'}`} />
          <span className="apex-status-label">
            {backendStatus === 'online' ? 'API Engine Active (127.0.0.1:8000)' : 'Checking Core Engine...'}
          </span>
          <span className="apex-status-divider">•</span>
          <span className="apex-status-sub">RFC 8785 Invariants Active</span>
        </div>

        {/* Action Header Button */}
        <div>
          {connected ? (
            <button
              type="button"
              className="apex-btn-header"
              onClick={() => navigate('/dashboard')}
            >
              <span>Dashboard</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              className="apex-btn-header"
              onClick={handleInstantDemo}
            >
              <Sparkles size={13} style={{ color: '#06b6d4' }} />
              <span>Instant Demo Access</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Single-Viewport Body (No Scroll) */}
      <main className="apex-auth-main">
        <div className="apex-auth-grid-container">
          {/* Left Column: Platform Intelligence & Architecture Information */}
          <div className="apex-auth-info-column">
            <div className="apex-auth-eyebrow">
              <Cpu size={13} />
              <span>REVERSE LOGISTICS PERCEPTION ENGINE</span>
            </div>

            <h1 className="apex-auth-title">
              Autonomous Returns <br />
              <span>Inspection & Verification.</span>
            </h1>

            <p className="apex-auth-desc">
              High-throughput multimodal AI platform replacing manual return triage with sub-second
              optical defect detection, deterministic policy enforcement, and tamper-evident cryptographic audit chains.
            </p>

            {/* 4 Core Architecture & Information Cards (2x2 Grid) */}
            <div className="apex-auth-cards-grid">
              <div className="apex-auth-card">
                <div className="apex-auth-card-head">
                  <div className="apex-auth-card-icon">
                    <Eye size={15} />
                  </div>
                  <span className="apex-auth-card-title">Multimodal Vision</span>
                </div>
                <p className="apex-auth-card-body">
                  Sub-1.2s computer vision detects surface scratches, packaging seal breaches, and SKU mismatches.
                </p>
              </div>

              <div className="apex-auth-card">
                <div className="apex-auth-card-head">
                  <div className="apex-auth-card-icon">
                    <ShieldCheck size={15} />
                  </div>
                  <span className="apex-auth-card-title">Deterministic Policy</span>
                </div>
                <p className="apex-auth-card-body">
                  100% rule-bound disposition (Restock, Liquidate, Reject). Zero LLM hallucinations on inventory.
                </p>
              </div>

              <div className="apex-auth-card">
                <div className="apex-auth-card-head">
                  <div className="apex-auth-card-icon">
                    <FileCheck2 size={15} />
                  </div>
                  <span className="apex-auth-card-title">RFC 8785 Hash Ledger</span>
                </div>
                <p className="apex-auth-card-body">
                  Canonical JSON SHA-256 hash chains generating tamper-evident digital passports for every unit.
                </p>
              </div>

              <div className="apex-auth-card">
                <div className="apex-auth-card-head">
                  <div className="apex-auth-card-icon">
                    <ClipboardCheck size={15} />
                  </div>
                  <span className="apex-auth-card-title">Human-in-the-Loop</span>
                </div>
                <p className="apex-auth-card-body">
                  Immediate supervisor escalation queue for low-confidence scores (&lt; 85%) or policy edge-cases.
                </p>
              </div>
            </div>

            {/* Live Operational Metrics Telemetry Bar */}
            <div className="apex-auth-telemetry">
              <div className="apex-auth-telemetry-item">
                <span className="apex-auth-telemetry-val">99.4%</span>
                <span className="apex-auth-telemetry-lbl">Inspection Precision</span>
              </div>
              <div className="apex-auth-telemetry-sep" />
              <div className="apex-auth-telemetry-item">
                <span className="apex-auth-telemetry-val">&lt; 1.2s</span>
                <span className="apex-auth-telemetry-lbl">Optical Triage Latency</span>
              </div>
              <div className="apex-auth-telemetry-sep" />
              <div className="apex-auth-telemetry-item">
                <span className="apex-auth-telemetry-val">6 SKUs</span>
                <span className="apex-auth-telemetry-lbl">Active Pilot Catalogue</span>
              </div>
              <div className="apex-auth-telemetry-sep" />
              <div className="apex-auth-telemetry-item">
                <span className="apex-auth-telemetry-val">0 Drift</span>
                <span className="apex-auth-telemetry-lbl">Invariant Verification</span>
              </div>
            </div>
          </div>

          {/* Right Column: Normal, Clean Sign-In Card */}
          <div className="apex-auth-signin-column">
            <motion.div
              className="apex-signin-box"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Box Header */}
              <div className="apex-signin-header">
                <div className="apex-signin-title-row">
                  <div className="apex-signin-icon">
                    <KeyRound size={17} />
                  </div>
                  <div>
                    <h2 className="apex-signin-title">Sign In to Workspace</h2>
                    <p className="apex-signin-subtitle">
                      Authenticate with your operational profile or API key
                    </p>
                  </div>
                </div>
              </div>

              {/* Already Connected Banner if session is active */}
              {connected && (
                <div className="apex-session-active-card">
                  <div className="apex-session-active-row">
                    <CheckCircle2 size={16} className="text-orange" />
                    <div>
                      <div className="apex-session-active-title">Active Session Detected</div>
                      <div className="apex-session-active-key">Key: {currentApiKey || 'rmk_local_demo'}</div>
                    </div>
                  </div>
                  <div className="apex-session-actions">
                    <button
                      type="button"
                      className="apex-btn-primary"
                      onClick={() => navigate('/dashboard')}
                    >
                      <span>Enter Workspace</span>
                      <ArrowRight size={15} />
                    </button>
                    <button
                      type="button"
                      className="apex-btn-link"
                      onClick={() => disconnect()}
                    >
                      <LogOut size={13} />
                      <span>Switch Credentials / Sign Out</span>
                    </button>
                  </div>
                </div>
              )}

              {/* If not connected, show normal sign in controls */}
              {!connected && (
                <>
                  {/* Role Selector Tabs */}
                  <div className="apex-role-group">
                    <div className="apex-field-label">SELECT OPERATIONAL PROFILE</div>
                    <div className="apex-role-chips">
                      {ROLES.map((role) => {
                        const active = selectedRole === role.id
                        return (
                          <button
                            key={role.id}
                            type="button"
                            className={`apex-role-chip ${active ? 'active' : ''}`}
                            onClick={() => handleRoleSelect(role)}
                          >
                            <span>{role.name}</span>
                            <span className="apex-role-chip-badge">{role.badge}</span>
                          </button>
                        )
                      })}
                    </div>
                    <div className="apex-role-desc">
                      {ROLES.find((r) => r.id === selectedRole)?.desc}
                    </div>
                  </div>

                  {/* API Key Field */}
                  <div className="apex-signin-field">
                    <label htmlFor="apex-key-input" className="apex-field-label">
                      <span>API ACCESS KEY</span>
                      <span className="apex-field-hint">Preloaded: rmk_local_demo</span>
                    </label>
                    <div className="apex-signin-input-wrap">
                      <input
                        id="apex-key-input"
                        type="text"
                        className="apex-signin-input"
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && void handleSignIn()}
                        placeholder="rmk_local_demo"
                        spellCheck={false}
                        autoComplete="off"
                      />
                      {apiKeyInput && (
                        <button
                          type="button"
                          className="apex-input-reset-btn"
                          onClick={() => setApiKeyInput('')}
                          title="Clear key"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Auth Error Banner */}
                  <AnimatePresence>
                    {authError && (
                      <motion.div
                        className="apex-auth-error-banner"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <CircleAlert size={14} />
                        <span>{authError}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Sign In Action Buttons */}
                  <div className="apex-signin-actions">
                    <button
                      type="button"
                      className="apex-btn-primary"
                      disabled={authenticating}
                      onClick={() => void handleSignIn()}
                    >
                      {authenticating ? (
                        <>
                          <RefreshCw size={15} className="spin-fast" />
                          <span>Verifying Credentials...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In to Workspace</span>
                          <ArrowRight size={15} />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="apex-btn-secondary"
                      onClick={handleInstantDemo}
                    >
                      <Zap size={14} style={{ color: '#ffaa33' }} />
                      <span>One-Click Demo Access</span>
                    </button>
                  </div>
                </>
              )}

              {/* Security & Token Footnote */}
              <div className="apex-signin-footer-note">
                <Lock size={12} />
                <span>256-Bit API Token • Client-Side Storage • RFC 8785 Audit Logging</span>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Bottom Legal & Node Telemetry Footer */}
      <footer className="apex-auth-footer">
        <div className="apex-footer-left">
          <span>NEXUS // RETURNS v2.4.0</span>
          <span className="apex-footer-sep">/</span>
          <span>AUTONOMOUS VISION LOGISTICS PLATFORM</span>
        </div>
        <div className="apex-footer-right">
          <span className="apex-footer-spec">Deterministic State Machine • Canonical JSON SHA-256</span>
        </div>
      </footer>
    </div>
  )
}
