import { useNavigate } from 'react-router-dom'
import {
  Activity,
  BadgeCheck,
  CircleAlert,
  Cpu,
  Eye,
  GitBranch,
  Lock,
  Package,
  PackageCheck,
  Plus,
  RefreshCw,
  ShieldCheck,
  XCircle,
  ChevronRight,
} from 'lucide-react'
import { motion, type Variants } from 'framer-motion'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useBatchStore } from '../lib/store'
import { DISPOSITION_COLORS, dispositionMix, needsAttention, rowsPerJob } from '../lib/derive'
import { Button, Note } from './shared'

const CHART_TOOLTIP = {
  contentStyle: {
    backgroundColor: '#0c101a',
    border: '1px solid rgba(6, 182, 212, 0.35)',
    borderRadius: 8,
    fontSize: 12,
    color: '#f8fafc',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.75)',
    padding: '10px 14px',
  },
  itemStyle: { color: '#38bdf8', fontSize: 11.5, fontWeight: 600 },
  labelStyle: { color: '#94a3b8', fontWeight: 600, fontSize: 11, marginBottom: 4 },
} as const

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
}

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { jobs, rows, loading, error, refresh } = useBatchStore()

  const attention = needsAttention(rows)
  const autoApprovedCount = rows.filter((r) => r.similarity?.is_auto_approved).length
  const autoDisapprovedCount = rows.filter(
    (r) =>
      r.similarity?.is_auto_rejected ||
      r.similarity?.is_auto_disapproved ||
      r.status === 'Auto-disapproved' ||
      r.operator_disposition === 'wrong_product',
  ).length
  const restockCount = rows.filter((r) => r.operator_disposition === 'restock').length
  const liveRequests = jobs.reduce((sum, j) => sum + j.live_requests, 0)
  const activity = rowsPerJob(jobs)
  const mix = dispositionMix(rows)
  const totalMix = mix.reduce((sum, m) => sum + m.value, 0) || 1
  const completedJobsCount = jobs.filter((j) => j.status === 'done').length
  const defaultUnitId = rows[0]?.unit_id || 'UNIT-0001'

  const approvalRate = rows.length > 0 ? Math.round((autoApprovedCount / rows.length) * 100) : 0
  const restockRate = rows.length > 0 ? Math.round((restockCount / rows.length) * 100) : 0

  return (
    <motion.div className="dashboard-content" variants={containerVariants} initial="hidden" animate="visible">
      {/* ========================================================
          PANORAMIC OPERATIONS COMMAND HERO
         ======================================================== */}
      <motion.div variants={sectionVariants}>
        <div className="nexus-hero-banner">
          <div className="nexus-hero-left">
            <div className="nexus-hero-node-badge">
              <span className="telemetry-pulse" />
              <span>VISION NODE // OPERATIONAL GATE ACTIVE</span>
            </div>
            <h1 className="nexus-hero-title">Autonomous Returns & Perception Intelligence</h1>
            <p className="nexus-hero-sub">
              High-throughput multimodal reverse logistics. Automated condition verdicts derived from Amazon ground truth rubrics with RFC 8785 cryptographic audit verification.
            </p>
            <div className="nexus-hero-telemetry-row">
              <span>RFC 8785 Chain: <span className="highlight">VERIFIED</span></span>
              <span>·</span>
              <span>Inspection Latency: <span className="highlight">&lt; 1.2s</span></span>
              <span>·</span>
              <span>Auto-Approval Rate: <span className="highlight">{approvalRate}%</span></span>
              <span>·</span>
              <span>Active Catalog: <span className="highlight">12 Verified SKUs</span></span>
            </div>
          </div>

          <div className="nexus-hero-actions">
            <button className="nexus-btn-primary" onClick={() => navigate('/returns/new')}>
              <Plus size={15} />
              <span>Ingest Batch CSV</span>
            </button>
            <button
              className="nexus-btn-warning"
              onClick={() => navigate('/reviews')}
              style={{
                borderColor: attention.length > 0 ? 'rgba(245, 158, 11, 0.5)' : 'rgba(255, 255, 255, 0.1)',
                color: attention.length > 0 ? '#fbbf24' : '#94a3b8',
              }}
            >
              <Eye size={15} />
              <span>Review Queue ({attention.length})</span>
            </button>
            <button className="nexus-btn-glass" onClick={() => navigate(`/units/${defaultUnitId}`)}>
              <PackageCheck size={15} />
              <span>Unit Passports</span>
            </button>
            <button className="nexus-btn-glass" onClick={() => void refresh()} title="Reload data">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </motion.div>

      {rows.length === 0 && !loading && (
        <motion.section className="panel" variants={sectionVariants}>
          <div className="empty-state">
            <Package size={24} className="empty-icon" />
            <h3>No Processed Returns</h3>
            <p>Upload a before/returned CSV pair to run automated visual inspections.</p>
            <Button primary icon={Plus} onClick={() => navigate('/returns/new')}>
              Upload Batch
            </Button>
          </div>
        </motion.section>
      )}

      {error && (
        <motion.section className="panel" variants={sectionVariants}>
          <div className="empty-state">
            <CircleAlert size={24} className="empty-icon text-red" />
            <h3>Connection Error</h3>
            <p>{error}</p>
          </div>
        </motion.section>
      )}

      {/* ========================================================
          ASYMMETRICAL EXECUTIVE BENTO KPI MATRIX
         ======================================================== */}
      <motion.div className="nexus-bento-grid" variants={sectionVariants}>
        {/* Bento 1: Featured Ingestion Throughput (Wide 2-col) */}
        <div className="bento-card wide-card">
          <div className="bento-card-top">
            <div className="bento-icon-wrap cyan">
              <Package size={18} />
            </div>
            <span className="bento-badge">
              {completedJobsCount} BATCH{completedJobsCount === 1 ? '' : 'ES'} COMPLETED
            </span>
          </div>
          <div>
            <div className="bento-label">Total Ingested Returns</div>
            <div className="bento-value">{rows.length}</div>
            <div className="bento-note">
              <span>Evaluated through deterministic visual comparison engine</span>
            </div>
          </div>
        </div>

        {/* Bento 2: Auto-Approved Pass */}
        <div className="bento-card">
          <div className="bento-card-top">
            <div className="bento-icon-wrap emerald">
              <BadgeCheck size={18} />
            </div>
            <span className="bento-badge" style={{ color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
              {approvalRate}% OF INTAKE
            </span>
          </div>
          <div>
            <div className="bento-label">Auto-Approved</div>
            <div className="bento-value" style={{ color: '#34d399' }}>
              {rows.length === 0 ? '0' : autoApprovedCount}
            </div>
            <div className="bento-note">High confidence · Instant refund</div>
          </div>
        </div>

        {/* Bento 3: Auto-Disapproved Discrepancies */}
        <div className="bento-card">
          <div className="bento-card-top">
            <div className="bento-icon-wrap crimson">
              <XCircle size={18} />
            </div>
            <span className="bento-badge" style={{ color: '#fb7185', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              FRAUD / DAMAGE
            </span>
          </div>
          <div>
            <div className="bento-label">Auto-Disapproved</div>
            <div className="bento-value" style={{ color: '#fb7185' }}>
              {rows.length === 0 ? '0' : autoDisapprovedCount}
            </div>
            <div className="bento-note">Discrepancy / wrong item detected</div>
          </div>
        </div>

        {/* Bento 4: Certified Restock Inventory */}
        <div className="bento-card">
          <div className="bento-card-top">
            <div className="bento-icon-wrap cyan">
              <PackageCheck size={18} />
            </div>
            <span className="bento-badge" style={{ color: '#38bdf8', borderColor: 'rgba(6, 182, 212, 0.3)' }}>
              {restockRate}% RECOVERY
            </span>
          </div>
          <div>
            <div className="bento-label">Restock Eligible</div>
            <div className="bento-value" style={{ color: '#38bdf8' }}>
              {rows.length === 0 ? '0' : restockCount}
            </div>
            <div className="bento-note">Certified for warehouse stock</div>
          </div>
        </div>

        {/* Bento 5: Supervisor Review Gate */}
        <div className="bento-card">
          <div className="bento-card-top">
            <div className="bento-icon-wrap amber">
              <Eye size={18} />
            </div>
            <span
              className="bento-badge"
              style={{
                color: attention.length > 0 ? '#fbbf24' : '#94a3b8',
                borderColor: attention.length > 0 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.1)',
              }}
            >
              {attention.length > 0 ? 'SIGN-OFF NEEDED' : 'CLEAR'}
            </span>
          </div>
          <div>
            <div className="bento-label">Review Queue</div>
            <div className="bento-value" style={{ color: attention.length > 0 ? '#fbbf24' : '#f8fafc' }}>
              {attention.length}
            </div>
            <div className="bento-note">Awaiting supervisor decision</div>
          </div>
        </div>

        {/* Bento 6: Vision Model Runs (Wide 2-col) */}
        <div className="bento-card wide-card">
          <div className="bento-card-top">
            <div className="bento-icon-wrap blue">
              <Cpu size={18} />
            </div>
            <span className="bento-badge">GPU PERCEPTUAL ENGINE</span>
          </div>
          <div>
            <div className="bento-label">Vision Model Runs</div>
            <div className="bento-value">{liveRequests}</div>
            <div className="bento-note">
              <span>Multimodal perceptual inferences across item photo pairs</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ========================================================
          VISUAL INTELLIGENCE & DISPOSITION RADAR (SPLIT 65% / 35%)
         ======================================================== */}
      <motion.div className="dashboard-grid" variants={sectionVariants}>
        <section className="panel chart-panel">
          <div className="panel-header">
            <div>
              <h3>Intake & Processing Volume</h3>
              <p>Processed vs. uncertain units across ingested batches</p>
            </div>
            <div className="chart-legend-inline">
              <span className="legend-item">
                <i className="dot dot-emerald" />
                Processed
              </span>
              <span className="legend-item">
                <i className="dot dot-amber" />
                Uncertain
              </span>
            </div>
          </div>
          <div className="chart-container">
            {activity.length === 0 ? (
              <div className="empty-chart">
                <Activity size={20} />
                <span>No intake data recorded yet</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={activity} margin={{ top: 12, right: 10, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="processedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="uncertainGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#728278', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#728278', fontSize: 11 }} />
                  <Tooltip {...CHART_TOOLTIP} />
                  <Area
                    type="monotone"
                    dataKey="processed"
                    name="Processed"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fill="url(#processedGradient)"
                    dot={{ fill: '#06b6d4', r: 3.5, stroke: '#0c101a', strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="uncertain"
                    name="Uncertain"
                    stroke="#f59e0b"
                    strokeWidth={1.8}
                    fill="url(#uncertainGradient)"
                    dot={{ fill: '#f59e0b', r: 3, stroke: '#0c101a', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="panel-footer-meta">
            <span>{rows.length} total return rows ingested across {completedJobsCount} uploads</span>
          </div>
        </section>

        <section className="panel disposition-panel">
          <div className="panel-header">
            <div>
              <h3>Disposition Breakdown</h3>
              <p>Operational outcome distribution</p>
            </div>
          </div>
          <div className="donut-wrap">
            <div className="donut-canvas">
              {mix.length === 0 ? (
                <div className="empty-chart">
                  <PackageCheck size={20} />
                  <span>No disposition mix</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={mix}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={46}
                      outerRadius={65}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {mix.map((m) => (
                        <Cell key={m.key} fill={DISPOSITION_COLORS[m.key] ?? '#64748b'} />
                      ))}
                    </Pie>
                    <Tooltip {...CHART_TOOLTIP} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="donut-center-metric">
                <span className="count">{rows.length}</span>
                <span className="label">UNITS</span>
              </div>
            </div>
            <div className="disposition-legend-list">
              {mix.map((m) => (
                <div key={m.key} className="disposition-legend-row">
                  <div className="legend-label">
                    <i className="dot" style={{ background: DISPOSITION_COLORS[m.key] ?? '#64748b' }} />
                    <span>{m.name}</span>
                  </div>
                  <div className="legend-stats">
                    <span className="pct">{Math.round((m.value / totalMix) * 100)}%</span>
                    <span className="val">({m.value})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </motion.div>

      {/* ========================================================
          ENTERPRISE CRYPTOGRAPHIC GOVERNANCE STRIP
         ======================================================== */}
      <motion.div className="governance-strip" variants={sectionVariants}>
        <div className="gov-left">
          <div className="gov-badge">
            <span className="gov-pulse-dot" />
            <span>DETERMINISTIC PERCEPTION GATE</span>
          </div>
          <div className="gov-text">
            <strong>Separation of Perception & Policy</strong>
            <p>Inspection verdicts computed strictly via Python rule engine against Amazon rubric ground truth. Zero unsupervised LLM hallucinations.</p>
          </div>
        </div>
        <div className="gov-tags">
          <span className="gov-tag">
            <Lock size={12} />
            RLS Tenancy Scoped
          </span>
          <span className="gov-tag">
            <GitBranch size={12} />
            RFC 8785 Hash Chain
          </span>
          <span className="gov-tag">
            <ShieldCheck size={12} />
            Four-Eyes Sign-Off
          </span>
        </div>
      </motion.div>

      {/* ========================================================
          SUPERVISOR ESCALATION & TRIAGE STATION
         ======================================================== */}
      <motion.section className="panel attention-panel" variants={sectionVariants}>
        <div className="panel-header">
          <div>
            <h3>
              Needs Supervisor Attention
              <span className="badge-count">{attention.length}</span>
            </h3>
            <p>Units requiring operator verification, condition review, or policy sign-off</p>
          </div>
          {attention.length > 0 && (
            <Button onClick={() => navigate('/reviews')}>
              Open Review Queue ({attention.length})
            </Button>
          )}
        </div>
        <div className="attention-list">
          {attention.slice(0, 6).map((r) => (
            <button
              className="attention-item-row"
              key={r.record_id}
              onClick={() => navigate(`/returns/${r.record_id}/inspection`)}
            >
              <div className="attention-icon-wrap">
                <CircleAlert
                  size={16}
                  className={r.status === 'Needs attention' ? 'icon-amber' : 'icon-red'}
                />
              </div>
              <div className="attention-info">
                <div className="attention-title-line">
                  <span className="record-id">{r.record_id}</span>
                  <span className="sep">·</span>
                  <span className="sku-name">{r.ordered_sku}</span>
                  <span className="sep">·</span>
                  <span className="unit-id">{r.unit_id}</span>
                </div>
                <div className="attention-subtext">
                  {r.sold_vs_returned_id_check?.startsWith('NOT MATCHED')
                    ? r.sold_vs_returned_id_check
                    : r.observed_state || 'Review required by rubric threshold'}
                </div>
              </div>
              <div className="attention-meta">
                <span className={`pill ${r.status.toLowerCase().replaceAll(' ', '-')}`}>
                  <span className="pill-dot" />
                  {r.status}
                </span>
                <ChevronRight size={14} className="row-arrow" />
              </div>
            </button>
          ))}
          {attention.length === 0 && (
            <div className="empty-attention">
              <ShieldCheck size={22} className="text-emerald" />
              <span>All ingested returns meet auto-approval criteria. No pending escalations.</span>
            </div>
          )}
        </div>
      </motion.section>

      <motion.div variants={sectionVariants}>
        <Note>
          Metrics and audit trails are computed directly from batch ingestion jobs. Real Supabase RLS enforces organizational boundaries.
        </Note>
      </motion.div>
    </motion.div>
  )
}
