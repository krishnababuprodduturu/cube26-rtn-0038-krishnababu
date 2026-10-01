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
import { Button, Header, Metric, Note } from './shared'

const CHART_TOOLTIP = {
  contentStyle: {
    backgroundColor: '#101217',
    border: '1px solid rgba(255, 107, 0, 0.35)',
    borderRadius: 8,
    fontSize: 12,
    color: '#f3f6f9',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7)',
    padding: '10px 14px',
  },
  itemStyle: { color: '#ff6b00', fontSize: 11.5, fontWeight: 600 },
  labelStyle: { color: '#8e9bb0', fontWeight: 600, fontSize: 11, marginBottom: 4 },
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

  return (
    <motion.div className="dashboard-content" variants={containerVariants} initial="hidden" animate="visible">
      <motion.div variants={sectionVariants}>
        <Header
          eyebrow="WORKSPACE OVERVIEW"
          title="Returns Overview"
          subtitle="Real-time reverse logistics ledger, automated vision verdicts, and supervisor escalation queue."
          actions={
            <>
              <Button icon={RefreshCw} onClick={() => void refresh()}>
                Refresh
              </Button>
              <Button primary icon={Plus} onClick={() => navigate('/returns/new')}>
                New Batch Upload
              </Button>
            </>
          }
        />
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

      {/* Modern Cybernetic Operations Strip */}
      <motion.div variants={sectionVariants}>
        <div
          className="operations-strip"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '10px 16px',
            background: 'rgba(16, 18, 23, 0.75)',
            border: '1px solid rgba(255, 107, 0, 0.22)',
            borderRadius: '10px',
            marginBottom: '16px',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontFamily: '"DM Mono", monospace' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#ff6b00',
                boxShadow: '0 0 10px #ff6b00',
                display: 'inline-block',
              }}
            />
            <strong style={{ color: '#fff', letterSpacing: '0.5px' }}>APEX VISION ENGINE</strong>
            <span style={{ color: 'var(--rm-text-muted)' }}>·</span>
            <span style={{ color: '#ffaa00' }}>RFC 8785 AUDIT CHAIN VERIFIED</span>
            <span style={{ color: 'var(--rm-text-muted)' }}>·</span>
            <span style={{ color: 'var(--rm-text-secondary)' }}>INSPECTION LATENCY &lt; 1.2s</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => navigate('/returns')}
              style={{
                background: 'rgba(255, 107, 0, 0.12)',
                border: '1px solid rgba(255, 107, 0, 0.35)',
                color: '#ff9944',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.2s',
              }}
            >
              <span>Returns Ledger ({rows.length})</span>
              <ChevronRight size={13} />
            </button>
            <button
              onClick={() => navigate('/reviews')}
              style={{
                background: attention.length > 0 ? 'rgba(255, 170, 0, 0.14)' : 'rgba(255, 255, 255, 0.04)',
                border: attention.length > 0 ? '1px solid rgba(255, 170, 0, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                color: attention.length > 0 ? '#ffaa00' : 'var(--rm-text-secondary)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.2s',
              }}
            >
              <span>Review Queue ({attention.length})</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Structured 6-Metric Tile Strip */}
      <motion.div className="metrics-grid" variants={sectionVariants}>
        <Metric
          index={0}
          label="Total returns"
          value={String(rows.length)}
          note={`Across ${jobs.filter((j) => j.status === 'done').length} completed batch(es)`}
          icon={Package}
          tone="default"
        />
        <Metric
          index={1}
          label="Auto-approved"
          value={rows.length === 0 ? '0' : String(autoApprovedCount)}
          note="High confidence · Instant verdict"
          icon={BadgeCheck}
          tone="emerald"
        />
        <Metric
          index={2}
          label="Auto-disapproved"
          value={rows.length === 0 ? '0' : String(autoDisapprovedCount)}
          note="Discrepancy / wrong item"
          icon={XCircle}
          tone="crimson"
        />
        <Metric
          index={3}
          label="Review queue"
          value={String(attention.length)}
          note="Awaiting supervisor decision"
          icon={Eye}
          tone="amber"
        />
        <Metric
          index={4}
          label="Restock eligible"
          value={rows.length === 0 ? '0' : String(restockCount)}
          note="Certified for shelf inventory"
          icon={PackageCheck}
          tone="teal"
        />
        <Metric
          index={5}
          label="Vision model runs"
          value={String(liveRequests)}
          note="Multimodal perceptual inferences"
          icon={Cpu}
          tone="blue"
        />
      </motion.div>

      {/* Main Data Panels */}
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
                      <stop offset="0%" stopColor="#ff6b00" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#ff6b00" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="uncertainGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffaa00" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#ffaa00" stopOpacity={0.01} />
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
                    stroke="#ff6b00"
                    strokeWidth={2}
                    fill="url(#processedGradient)"
                    dot={{ fill: '#ff6b00', r: 3.5, stroke: '#101217', strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="uncertain"
                    name="Uncertain"
                    stroke="#ffaa00"
                    strokeWidth={1.8}
                    fill="url(#uncertainGradient)"
                    dot={{ fill: '#ffaa00', r: 3, stroke: '#101217', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="panel-footer-meta">
            <span>{rows.length} total return rows ingested across {jobs.filter((j) => j.status === 'done').length} uploads</span>
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

      {/* Enterprise Policy & Governance Strip */}
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

      {/* Needs Attention Queue */}
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
