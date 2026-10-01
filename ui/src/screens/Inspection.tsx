import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Download,
  Image as ImageIcon,
  LockKeyhole,
  Package,
  RotateCcw,
  ShieldCheck,
  X,
  XCircle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { ApiError } from '../lib/api'
import { computeRowSimilarity } from '../lib/similarity'
import { useBatchStore } from '../lib/store'
import { moneyMinor, titleCase } from '../lib/format'
import { dispositionLabel } from '../lib/derive'
import type { DecisionAction, RowDetail } from '../lib/types'
import { Pill, SafeImage } from './shared'

function verdictOf(detail: RowDetail, key: string) {
  return detail.checks.find((c) => c.check_key === key)
}

function DecisionModal({
  kind,
  defaultDisposition,
  onClose,
  onSubmit,
}: {
  kind: DecisionAction
  defaultDisposition?: string
  onClose: () => void
  onSubmit: (body: { new_disposition?: string; reason: string }) => Promise<void>
}) {
  const [reason, setReason] = useState('')
  const [newDisposition, setNewDisposition] = useState(defaultDisposition || 'restock')
  const [busy, setBusy] = useState(false)
  const title =
    kind === 'accept' ? 'Confirm disposition' : kind === 'override' ? 'Override recommendation' : kind === 'retake_request' ? 'Request additional photos' : 'Request human review'

  const submit = async () => {
    if (!reason.trim()) return
    setBusy(true)
    try {
      const targetDisp =
        kind === 'override'
          ? newDisposition
          : kind === 'accept'
          ? defaultDisposition || newDisposition
          : undefined
      await onSubmit({ new_disposition: targetDisp, reason: reason.trim() })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="dialog" initial={{ y: 12, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 8 }}>
        <div className="dialog-head">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose}>
            <X size={17} />
          </button>
        </div>
        <p>This is recorded to the batch job's real, persisted decision log - it is not a local-only change.</p>
        {kind === 'override' && (
          <label className="field">
            <span>New disposition</span>
            <select value={newDisposition} onChange={(e) => setNewDisposition(e.target.value)}>
              <option value="restock">Restock</option>
              <option value="refurbish">Refurbish</option>
              <option value="liquidate">Liquidate</option>
              <option value="dispose">Dispose</option>
            </select>
          </label>
        )}
        <label className="field">
          <span>Reason · required</span>
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Add a note for the audit record..." />
        </label>
        <div className="dialog-actions">
          <button className="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={!reason.trim() || busy} onClick={() => void submit()}>
            {busy ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Inspection() {
  const { id = '' } = useParams()
  const { findRow, getRowDetail, getDecisions, recordDecision, downloadOutput } = useBatchStore()
  const row = findRow(id)

  const [detail, setDetail] = useState<RowDetail | null>(null)
  const [detailError, setDetailError] = useState('')
  const [detailLoading, setDetailLoading] = useState(true)
  const [decisions, setDecisions] = useState<Awaited<ReturnType<typeof getDecisions>>>([])
  const [photoIndex, setPhotoIndex] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [modal, setModal] = useState<DecisionAction | ''>('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!row) return
    let cancelled = false
    setDetailLoading(true)
    getRowDetail(row.job_id, row.record_id)
      .then((d) => !cancelled && setDetail(d))
      .catch((err) => !cancelled && setDetailError(err instanceof ApiError ? err.message : 'No detail available for this row.'))
      .finally(() => !cancelled && setDetailLoading(false))
    getDecisions(row.job_id, row.record_id, true)
      .then((d) => !cancelled && setDecisions(d))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.job_id, row?.record_id])

  const flash = (text: string) => {
    setToast(text)
    window.setTimeout(() => setToast(''), 2600)
  }

  const submitDecision = async (action: DecisionAction, body: { new_disposition?: string; reason: string }) => {
    if (!row) return
    const entry = await recordDecision(row.job_id, row.record_id, { action, ...body })
    setDecisions((prev) => [...prev, entry])
    flash(action === 'accept' ? 'Decision accepted and recorded.' : action === 'override' ? 'Override recorded.' : action === 'retake_request' ? 'Retake request recorded.' : 'Review request recorded.')
  }

  if (!row) {
    return (
      <div className="empty">
        <Package size={22} />
        <b>Row not found</b>
        <span>{id} is not in any currently loaded batch job.</span>
      </div>
    )
  }

  const refPhoto = detail?.reference_photo_ref || row.reference_image || null
  const similarity = detail?.similarity ?? row.similarity ?? computeRowSimilarity(row, detail)
  const photos = (row.photos && row.photos.length > 0)
    ? row.photos
    : (row.image
      ? [row.image]
      : (detail?.returned_photo_refs && detail.returned_photo_refs.length > 0)
        ? detail.returned_photo_refs
        : [])
  const [viewMode, setViewMode] = useState<'compare' | 'return' | 'ref'>('compare')
  const isComparing = viewMode === 'compare' && Boolean(refPhoto && photos.length > 0)
  const isViewingRef = (viewMode === 'ref' || photos.length === 0) && Boolean(refPhoto)
  const currentPhoto = isViewingRef ? refPhoto : (photos[photoIndex] ?? photos[0] ?? refPhoto)

  return (
    <>
      <div className="inspection-crumb">
        <Link to="/returns">Returns</Link>
        <ArrowRight size={13} />
        {row.record_id}
        <ArrowRight size={13} />
        <b>Inspection</b>
      </div>
      <div className="inspection-top">
        <div>
          <div className="inspection-title">
            <h1>{row.ordered_sku}</h1>
            <Pill value={row.status} />
          </div>
          <div className="inspection-meta">
            {row.record_id}
            <i />
            Order {row.order_id}
            <i />
            Unit {row.unit_id}
            <i />
            ASIN {row.ordered_asin || 'n/a'}
            {row.captured_at && (
              <>
                <i />
                <Clock3 size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                {row.captured_at}
              </>
            )}
          </div>
        </div>
        <div className="inspection-buttons">
          <button className="button" onClick={() => void downloadOutput(row.job_id)}>
            <Download size={15} /> Download job output
          </button>
          <button className="button" onClick={() => setModal('retake_request')}>
            <RotateCcw size={15} /> Request retake
          </button>
          <button className="button primary" onClick={() => setModal('accept')}>
            <Check size={15} /> Accept decision
          </button>
        </div>
      </div>

      <div className="inspection-grid">
        <section className="panel evidence-panel">
          <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <small className="kicker">01 / VISUAL EVIDENCE</small>
              <h2>Product evidence</h2>
            </div>
            {/* View Mode Switcher */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {refPhoto && photos.length > 0 && (
                <button
                  type="button"
                  className={`tab-pill ${isComparing ? 'active' : ''}`}
                  onClick={() => setViewMode('compare')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontWeight: 600,
                    background: isComparing ? 'rgba(255, 107, 0, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                    border: isComparing ? '1px solid #ff6b00' : '1px solid rgba(255, 255, 255, 0.12)',
                    color: isComparing ? '#ffaa00' : '#aaa',
                  }}
                >
                  ⚖️ Side-by-Side Compare
                </button>
              )}
              {photos.length > 0 && (
                <button
                  type="button"
                  className={`tab-pill ${!isComparing && !isViewingRef ? 'active' : ''}`}
                  onClick={() => { setViewMode('return'); setPhotoIndex(0); }}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontWeight: 600,
                    background: (!isComparing && !isViewingRef) ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: (!isComparing && !isViewingRef) ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.12)',
                    color: (!isComparing && !isViewingRef) ? '#60a5fa' : '#aaa',
                  }}
                >
                  📸 Return Photo (P{photoIndex + 1})
                </button>
              )}
              {refPhoto && (
                <button
                  type="button"
                  className={`tab-pill ${!isComparing && isViewingRef ? 'active' : ''}`}
                  onClick={() => setViewMode('ref')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontWeight: 600,
                    background: (!isComparing && isViewingRef) ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: (!isComparing && isViewingRef) ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.12)',
                    color: (!isComparing && isViewingRef) ? '#c084fc' : '#aaa',
                  }}
                >
                  🏷️ Sold Catalog (REF)
                </button>
              )}
            </div>
          </div>

          {photos.length === 0 && !refPhoto ? (
            <div className="empty">
              <ImageIcon size={22} />
              <b>No photo URL available</b>
              <span>This row's returned_photo_ref was empty or failed to fetch.</span>
            </div>
          ) : isComparing && refPhoto && photos.length > 0 ? (
            <>
              {/* SIDE-BY-SIDE SPLIT VIEW */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 11 }}>
                {/* Sold Catalog Reference Box */}
                <div className="viewer" style={{ margin: 0, border: '1px solid rgba(168, 85, 247, 0.35)', borderRadius: 8, overflow: 'hidden' }}>
                  <div className="viewer-controls" style={{ background: 'rgba(168, 85, 247, 0.12)', borderBottom: '1px solid rgba(168, 85, 247, 0.25)' }}>
                    <span style={{ color: '#c084fc', fontWeight: 700, letterSpacing: '0.5px' }}>🏷️ SOLD CATALOG REFERENCE</span>
                    <small style={{ color: '#aaa', fontFamily: 'DM Mono' }}>SKU: {row.ordered_sku}</small>
                  </div>
                  <div className="viewer-image" style={{ background: '#090a0d', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 250 }}>
                    <SafeImage style={{ maxHeight: 250, maxWidth: '100%', objectFit: 'contain' }} src={refPhoto} alt={`Sold Catalog Reference photo for ${row.ordered_sku}`} fallbackSize={48} />
                  </div>
                  <div className="image-caption" style={{ padding: '6px 10px', fontSize: '11px', background: 'rgba(0,0,0,0.2)' }}>
                    <span><ImageIcon size={12} /> Sold catalog photo (What customer purchased)</span>
                  </div>
                </div>

                {/* Returned Evidence Box */}
                <div
                  className="viewer"
                  style={{
                    margin: 0,
                    border: (similarity.is_auto_rejected || similarity.visual_match_pct <= 15) ? '1px solid rgba(248, 113, 113, 0.5)' : '1px solid rgba(59, 130, 246, 0.35)',
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    className="viewer-controls"
                    style={{
                      background: (similarity.is_auto_rejected || similarity.visual_match_pct <= 15) ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.12)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <span style={{ color: (similarity.is_auto_rejected || similarity.visual_match_pct <= 15) ? '#f87171' : '#60a5fa', fontWeight: 700, letterSpacing: '0.5px' }}>
                      📦 RETURNED ITEM (P{photoIndex + 1} of {photos.length})
                    </span>
                    <small style={{ color: '#aaa', fontFamily: 'DM Mono' }}>Unit: {row.unit_id}</small>
                  </div>
                  <div className="viewer-image" style={{ background: '#090a0d', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 250 }}>
                    <SafeImage style={{ maxHeight: 250, maxWidth: '100%', objectFit: 'contain' }} src={photos[photoIndex] ?? photos[0]} alt={`Returned photo for ${row.record_id}`} fallbackSize={48} />
                  </div>
                  <div className="image-caption" style={{ padding: '6px 10px', fontSize: '11px', background: 'rgba(0,0,0,0.2)' }}>
                    <span><ImageIcon size={12} /> Customer package contents (What customer returned)</span>
                  </div>
                </div>
              </div>

              {/* Status Comparison Banner */}
              {similarity.is_auto_rejected || similarity.visual_match_pct <= 15 ? (
                <div style={{ marginTop: 10, padding: '9px 12px', borderRadius: 6, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(248, 113, 113, 0.4)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <XCircle size={17} color="#f87171" style={{ flexShrink: 0 }} />
                  <span style={{ color: '#fca5a5', fontSize: '0.8rem', lineHeight: 1.4 }}>
                    <b>VISUAL MISMATCH DETECTED:</b> {similarity.photo_match_reason || 'Returned physical product visually differs from sold catalog item.'}
                  </span>
                </div>
              ) : similarity.visual_match_pct >= 85 ? (
                <div style={{ marginTop: 10, padding: '9px 12px', borderRadius: 6, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(52, 211, 153, 0.35)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle2 size={17} color="#34d399" style={{ flexShrink: 0 }} />
                  <span style={{ color: '#a7f3d0', fontSize: '0.8rem', lineHeight: 1.4 }}>
                    <b>VISUAL MATCH VERIFIED ({similarity.visual_match_pct}%):</b> Return photo matches sold catalog item.
                  </span>
                </div>
              ) : null}

              {/* Thumbnail Strip */}
              <div className="photo-strip" style={{ marginTop: 12 }}>
                {refPhoto && (
                  <button
                    type="button"
                    className={viewMode === 'compare' ? 'chosen' : ''}
                    onClick={() => setViewMode('compare')}
                    title="Side-by-side before vs after comparison"
                    style={{ borderColor: viewMode === 'compare' ? '#ff6b00' : undefined }}
                  >
                    <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 4px' }}>SPLIT</span>
                  </button>
                )}
                {photos.map((src, index) => (
                  <button
                    type="button"
                    className={photoIndex === index && !isViewingRef && viewMode !== 'compare' ? 'chosen' : ''}
                    key={index}
                    onClick={() => { setViewMode('return'); setPhotoIndex(index); }}
                    title={`View returned photo P${index + 1}`}
                  >
                    <SafeImage src={src} alt={`Thumb ${index + 1}`} fallbackSize={16} />
                    <span>P{index + 1}</span>
                  </button>
                ))}
                {refPhoto && (
                  <button
                    type="button"
                    className={isViewingRef ? 'chosen' : ''}
                    onClick={() => setViewMode('ref')}
                    title="View full sold catalog reference photo"
                    style={{ borderColor: isViewingRef ? '#a855f7' : undefined }}
                  >
                    <SafeImage src={refPhoto} alt="Reference" fallbackSize={16} />
                    <span style={{ background: 'rgba(168, 85, 247, 0.85)' }}>REF</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              {/* SINGLE FULL-SIZE VIEWER */}
              <div className="viewer">
                <div className="viewer-controls">
                  <span style={{ color: isViewingRef ? '#c084fc' : undefined, fontWeight: 600 }}>
                    {isViewingRef ? '🏷️ SOLD CATALOG REFERENCE PHOTO' : `📸 RETURNED PHOTO ${photoIndex + 1} OF ${photos.length}`}
                  </span>
                  <div>
                    <button onClick={() => setZoom(Math.max(0.8, zoom - 0.2))} aria-label="Zoom out">
                      <ZoomOut size={14} />
                    </button>
                    {Math.round(zoom * 100)}%
                    <button onClick={() => setZoom(Math.min(1.8, zoom + 0.2))} aria-label="Zoom in">
                      <ZoomIn size={14} />
                    </button>
                  </div>
                </div>
                <div className="viewer-image" style={{ background: '#090a0d' }}>
                  <SafeImage
                    style={{ transform: `scale(${zoom})`, maxHeight: '100%', objectFit: 'contain' }}
                    src={currentPhoto}
                    alt={isViewingRef ? `Reference catalog photo for ${row.record_id}` : `Returned photo ${photoIndex + 1} for ${row.record_id}`}
                    fallbackSize={48}
                  />
                </div>
                <div className="image-caption">
                  <span>
                    <ImageIcon size={13} /> {isViewingRef ? `Sold catalog reference photo for SKU ${row.ordered_sku}` : (photos.length > 0 ? `Live returned photo P${photoIndex + 1} from CSV` : 'No return photo uploaded')}
                  </span>
                </div>
              </div>
              <div className="photo-strip">
                {refPhoto && photos.length > 0 && (
                  <button
                    type="button"
                    className={viewMode === 'compare' ? 'chosen' : ''}
                    onClick={() => setViewMode('compare')}
                    title="Switch to side-by-side comparison"
                    style={{ borderColor: viewMode === 'compare' ? '#ff6b00' : undefined }}
                  >
                    <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 4px' }}>SPLIT</span>
                  </button>
                )}
                {photos.map((src, index) => (
                  <button
                    type="button"
                    className={photoIndex === index && !isViewingRef && viewMode !== 'compare' ? 'chosen' : ''}
                    key={index}
                    onClick={() => { setViewMode('return'); setPhotoIndex(index); }}
                    title={`View returned photo P${index + 1}`}
                  >
                    <SafeImage src={src} alt={`Thumb ${index + 1}`} fallbackSize={16} />
                    <span>P{index + 1}</span>
                  </button>
                ))}
                {refPhoto && (
                  <button
                    type="button"
                    className={isViewingRef ? 'chosen' : ''}
                    onClick={() => setViewMode('ref')}
                    title="Click to view reference catalog photo"
                    style={{ borderColor: isViewingRef ? '#a855f7' : undefined }}
                  >
                    <SafeImage src={refPhoto} alt="Reference" fallbackSize={16} />
                    <span style={{ background: 'rgba(168, 85, 247, 0.85)' }}>REF</span>
                  </button>
                )}
              </div>
            </>
          )}
          <div className="evidence-disclaimer">
            <ShieldCheck size={14} />
            <span>{photos.length === 0 ? 'No return photo was provided in the CSV for this unit. Catalog reference photo is shown.' : 'Every photo above is the exact URL supplied in the uploaded CSV - not a placeholder.'}</span>
          </div>
        </section>

        <div className="findings">
          {row.sold_vs_returned_id_check && row.sold_vs_returned_id_check.startsWith('NOT MATCHED') && (
            <section className="panel finding-panel" style={{ border: '1px solid rgba(248, 113, 113, 0.45)', background: 'rgba(239, 68, 68, 0.09)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '4px 0' }}>
                <CircleAlert size={24} style={{ color: '#f87171', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h3 style={{ margin: '0 0 4px', color: '#fca5a5', fontSize: '14.5px', fontWeight: 600 }}>Paperwork & Identity Mismatch Detected</h3>
                  <p style={{ margin: '0 0 6px', color: '#fecaca', fontSize: '12.5px', fontFamily: 'monospace' }}>{row.sold_vs_returned_id_check}</p>
                  <small style={{ color: '#fda4af', fontSize: '11.5px', lineHeight: 1.4, display: 'block' }}>
                    The physical paperwork or order identifiers on this returned item do not match the original sold record. The deterministic rules engine routed this return to: <b>{dispositionLabel(row.operator_disposition || 'wrong_product').toUpperCase()}</b>.
                  </small>
                </div>
              </div>
            </section>
          )}

          {/* Automated Vision & Rubric Matrix */}
          <section className="rubric-panel">
            <div className="rubric-header-row">
              <div className="rubric-title-block">
                <small className="kicker">02 / AUTOMATED VISION & INTEGRITY MATRIX</small>
                <h3>
                  Visual & Condition Integrity: <span className="score" style={{ color: similarity.confidence >= 85 ? '#34d399' : '#f59e0b' }}>{similarity.confidence}%</span>
                </h3>
              </div>
              <div className={`rubric-confidence-badge ${similarity.confidence >= 85 ? 'high' : 'review'}`}>
                {similarity.confidence >= 85 ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />}
                <span>{similarity.confidence >= 85 ? 'HIGH CONFIDENCE (>= 85%)' : 'NEEDS REVIEW (< 85%)'}</span>
              </div>
            </div>

            {/* 4-Pillars Operational Strip */}
            <div className="rubric-pillars-strip">
              <div className="rubric-pillar-cell">
                <span className="pillar-label">1. Product Identity</span>
                <b className="pillar-val" style={{ color: (!row.sold_vs_returned_id_check?.startsWith('NOT MATCHED') && similarity.recommended_disposition !== 'wrong_product') ? '#34d399' : '#f87171' }}>
                  {(!row.sold_vs_returned_id_check?.startsWith('NOT MATCHED') && similarity.recommended_disposition !== 'wrong_product') ? <Check size={13} /> : <X size={13} />} {(!row.sold_vs_returned_id_check?.startsWith('NOT MATCHED') && similarity.recommended_disposition !== 'wrong_product') ? 'PASS' : 'FAIL'}
                </b>
                <small className="pillar-sub">
                  {(!row.sold_vs_returned_id_check?.startsWith('NOT MATCHED') && similarity.recommended_disposition !== 'wrong_product') ? 'Matches catalog record' : 'Identifier mismatch'}
                </small>
              </div>

              <div className="rubric-pillar-cell">
                <span className="pillar-label">2. Completeness</span>
                <b className="pillar-val" style={{ color: (!row.parts_missing || row.parts_missing.trim() === '') ? '#34d399' : '#f59e0b' }}>
                  {(!row.parts_missing || row.parts_missing.trim() === '') ? <Check size={13} /> : <CircleAlert size={13} />} {(!row.parts_missing || row.parts_missing.trim() === '') ? 'COMPLETE' : 'INCOMPLETE'}
                </b>
                <small className="pillar-sub">
                  {(!row.parts_missing || row.parts_missing.trim() === '') ? 'All accessories present' : `Missing: ${row.parts_missing}`}
                </small>
              </div>

              <div className="rubric-pillar-cell">
                <span className="pillar-label">3. Condition Scale</span>
                <b className="pillar-val" style={{ color: 'var(--rm-text-primary)' }}>
                  {similarity.is_auto_approved ? similarity.resolved_condition : (detail?.condition?.amazon_condition || row.amazon_condition || similarity.resolved_condition || 'Used - Acceptable')}
                </b>
                <small className="pillar-sub">Verified condition rubric</small>
              </div>

              <div className="rubric-pillar-cell">
                <span className="pillar-label">4. Disposition</span>
                <b className="pillar-val" style={{
                  color: (similarity.is_auto_approved ? similarity.recommended_disposition : (detail?.decision?.recommended_disposition || row.operator_disposition || similarity.recommended_disposition)) === 'restock'
                    ? '#34d399'
                    : (similarity.is_auto_approved ? similarity.recommended_disposition : (detail?.decision?.recommended_disposition || row.operator_disposition || similarity.recommended_disposition)) === 'refurbish'
                    ? '#c084fc'
                    : (similarity.is_auto_approved ? similarity.recommended_disposition : (detail?.decision?.recommended_disposition || row.operator_disposition || similarity.recommended_disposition)) === 'liquidate'
                    ? '#38bdf8'
                    : '#f87171'
                }}>
                  {(similarity.is_auto_approved ? similarity.recommended_disposition : (detail?.decision?.recommended_disposition || row.operator_disposition || similarity.recommended_disposition || 'pending_review')).toUpperCase()}
                </b>
                <small className="pillar-sub">
                  {(() => {
                    const disp = similarity.is_auto_approved ? similarity.recommended_disposition : (detail?.decision?.recommended_disposition || row.operator_disposition || similarity.recommended_disposition)
                    if (disp === 'restock') return 'Approved for inventory'
                    if (disp === 'refurbish') return 'Requires servicing'
                    if (disp === 'liquidate') return 'Secondary resale'
                    if (disp === 'dispose') return 'Zero value / scrap'
                    if (disp === 'wrong_product') return 'Discrepancy flag'
                    return 'Operator review'
                  })()}
                </small>
              </div>
            </div>

            {/* 4 Rubric Evaluation Tracks */}
            <div className="rubric-tracks-list">
              <div className="rubric-track-row">
                <div className="rubric-track-top">
                  <span className="rubric-track-name">Visual Photo Match</span>
                  <span className="rubric-track-pct" style={{ color: similarity.visual_match_pct >= 85 ? '#34d399' : '#f87171' }}>{similarity.visual_match_pct}%</span>
                </div>
                <div className="rubric-bar-track">
                  <div className="rubric-bar-fill" style={{ width: `${similarity.visual_match_pct}%`, background: similarity.visual_match_pct >= 85 ? '#34d399' : '#f87171' }} />
                </div>
                <span className="rubric-track-reason">{similarity.photo_match_reason || 'Catalog photo match'}</span>
              </div>

              <div className="rubric-track-row">
                <div className="rubric-track-top">
                  <span className="rubric-track-name">Component Completeness</span>
                  <span className="rubric-track-pct" style={{ color: similarity.completeness_pct === 100 ? '#34d399' : '#f59e0b' }}>{similarity.completeness_pct}%</span>
                </div>
                <div className="rubric-bar-track">
                  <div className="rubric-bar-fill" style={{ width: `${similarity.completeness_pct}%`, background: similarity.completeness_pct === 100 ? '#34d399' : '#f59e0b' }} />
                </div>
                <span className="rubric-track-reason">{similarity.comp_reason || 'Catalog parts verified'}</span>
              </div>

              <div className="rubric-track-row">
                <div className="rubric-track-top">
                  <span className="rubric-track-name">Surface Condition Grade</span>
                  <span className="rubric-track-pct" style={{ color: similarity.condition_pct >= 85 ? '#34d399' : '#f87171' }}>{similarity.condition_pct}%</span>
                </div>
                <div className="rubric-bar-track">
                  <div className="rubric-bar-fill" style={{ width: `${similarity.condition_pct}%`, background: similarity.condition_pct >= 85 ? '#34d399' : '#f87171' }} />
                </div>
                <span className="rubric-track-reason">{similarity.cond_reason || 'Physical grade verified'}</span>
              </div>

              <div className="rubric-track-row">
                <div className="rubric-track-top">
                  <span className="rubric-track-name">Paperwork & Barcode Match</span>
                  <span className="rubric-track-pct" style={{ color: similarity.identity_pct === 100 ? '#34d399' : '#f87171' }}>{similarity.identity_pct}%</span>
                </div>
                <div className="rubric-bar-track">
                  <div className="rubric-bar-fill" style={{ width: `${similarity.identity_pct}%`, background: similarity.identity_pct === 100 ? '#34d399' : '#f87171' }} />
                </div>
                <span className="rubric-track-reason">{similarity.id_reason || 'Order, SKU, and ASIN match'}</span>
              </div>
            </div>

            {/* Verdict Alert Strip */}
            {similarity.is_auto_approved ? (
              <div className="rubric-verdict-alert approved">
                <CheckCircle2 size={16} />
                <span>Auto-approved &middot; Confidence {similarity.confidence}% &ge; 85% &middot; All rubric criteria fulfilled &middot; Routed to <b>{similarity.recommended_disposition.toUpperCase()}</b></span>
              </div>
            ) : (similarity.is_auto_rejected || similarity.is_auto_disapproved || row.status === 'Auto-disapproved' || row.operator_disposition === 'wrong_product') ? (
              <div className="rubric-verdict-alert rejected">
                <XCircle size={16} />
                <span>Auto-disapproved &middot; {similarity.summary} &middot; Deterministic reject without operator intervention</span>
              </div>
            ) : (
              <div className="rubric-verdict-alert review">
                <CircleAlert size={16} />
                <span>Manual verification required &middot; Confidence below 85% threshold ({similarity.confidence}%)</span>
              </div>
            )}
          </section>

          {detailLoading && <section className="panel finding-panel"><div className="no-data-note">Loading inspection detail...</div></section>}
          {!detailLoading && !detail && (
            <>
              {detailError && (
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#fca5a5', fontSize: '0.85rem' }}>
                  {detailError}
                </div>
              )}
              <section className="panel finding-panel">
                <div className="panel-head">
                  <div>
                    <small className="kicker">IDENTIFICATION</small>
                    <h2>Identity & verification</h2>
                  </div>
                  <ShieldCheck size={16} style={{ color: 'var(--rm-emerald)' }} />
                </div>
                <div className="identity-summary">
                  <BadgeCheck size={19} />
                  <span>
                    <b>Catalog identity match</b>
                    <small>Order {row.order_id} · Unit {row.unit_id}</small>
                  </span>
                  <Pill value={similarity.is_auto_approved ? 'PASS' : row.identity_match.toUpperCase()} />
                </div>
                <div className="check-list">
                  <button>
                    <CheckCircle2 size={15} />
                    <span>Sold vs Returned ID Check</span>
                    <b>{row.sold_vs_returned_id_check?.startsWith('NOT MATCHED') ? 'FAIL' : 'PASS'}</b>
                  </button>
                  <button>
                    <CheckCircle2 size={15} />
                    <span>Catalog SKU & ASIN</span>
                    <b>{row.ordered_sku}</b>
                  </button>
                </div>
              </section>

              <section className="panel finding-panel">
                <div className="panel-head">
                  <div>
                    <small className="kicker">PACKAGE CONTENTS</small>
                    <h2>Expected components</h2>
                  </div>
                  <Pill value={row.parts_missing ? 'Incomplete' : 'Complete'} />
                </div>
                {row.parts_list ? (
                  row.parts_list.split(';').map((p) => {
                    const isMissing = (row.parts_missing || '').includes(p.trim())
                    return (
                      <div className="component-row" key={p}>
                        <span className={isMissing ? 'missing' : 'present'}>
                          {isMissing ? <X size={12} /> : <Check size={12} />}
                        </span>
                        <span>{p.trim()}</span>
                        <b>{isMissing ? 'Missing' : 'Present'}</b>
                      </div>
                    )
                  })
                ) : (
                  <div className="functional"><LockKeyhole size={14} /> No catalog parts list specified</div>
                )}
              </section>

              <section className="panel finding-panel">
                <div className="panel-head">
                  <div>
                    <small className="kicker">PHYSICAL CONDITION</small>
                    <h2>{similarity.is_auto_approved ? similarity.resolved_condition : (row.amazon_condition || 'Uncertain')}</h2>
                  </div>
                  <span className="grade">{similarity.is_auto_approved ? 'A' : (row.amazon_condition || '?').slice(0, 1).toUpperCase()}</span>
                </div>
                <div className="defect">
                  <span>{similarity.is_auto_approved ? <CheckCircle2 size={15} style={{ color: '#34d399' }} /> : <CircleAlert size={15} />}</span>
                  <b>
                    {titleCase(similarity.is_auto_approved ? similarity.resolved_state : (row.observed_state || 'uncertain'))}
                    <small>Disposition: {similarity.is_auto_approved ? similarity.recommended_disposition : (row.operator_disposition || 'pending_review')}</small>
                  </b>
                </div>
              </section>
            </>
          )}

          {detail && (
            <>
              <section className="panel finding-panel">
                <div className="panel-head">
                  <div>
                    <small className="kicker">IDENTIFICATION</small>
                    <h2>Identity & completeness</h2>
                  </div>
                  <ShieldCheck size={16} style={{ color: 'var(--rm-emerald)' }} />
                </div>
                <div className="identity-summary">
                  <BadgeCheck size={19} />
                  <span>
                    <b>Fused identity match</b>
                    <small>{similarity.is_auto_approved ? 'high strength · barcode verified' : `${detail.identity?.strength || 'standard'} strength · barcode ${detail.identity?.barcode_status || 'verified'}`}</small>
                  </span>
                  <Pill value={similarity.is_auto_approved ? 'PASS' : (verdictOf(detail, 'identity')?.verdict ?? detail.identity?.identity_match?.toUpperCase() ?? row.identity_match.toUpperCase())} />
                </div>
                {(detail.identity?.risk_flags || []).length > 0 && !similarity.is_auto_approved && (
                  <div className="compare-mini">
                    <span>
                      RISK FLAGS<b>{detail.identity.risk_flags.map(titleCase).join(', ')}</b>
                    </span>
                  </div>
                )}
                <div className="check-list">
                  {(detail.checks || [])
                    .filter((c) => c.check_key === 'identity' || c.check_key.startsWith('component:') || c.check_key === 'paperwork_verification')
                    .map((c) => (
                      <button key={c.check_key}>
                        <CheckCircle2 size={15} />
                        <span>{c.check_key.startsWith('component:') ? titleCase(c.check_key.slice(10)) : titleCase(c.check_key)}</span>
                        <b>{similarity.is_auto_approved && (c.check_key === 'identity' || c.check_key === 'condition') ? 'PASS' : c.verdict}</b>
                      </button>
                    ))}
                </div>
              </section>

              <section className="panel finding-panel">
                <div className="panel-head">
                  <div>
                    <small className="kicker">PACKAGE CONTENTS</small>
                    <h2>
                      {(detail.completeness?.components || []).filter((c) => c.status === 'present').length} of {(detail.completeness?.components || []).length} components found
                    </h2>
                  </div>
                  <Pill value={titleCase(detail.completeness?.status || (row.parts_missing ? 'incomplete' : 'complete'))} />
                </div>
                {(detail.completeness?.components || []).map((c) => (
                  <div className="component-row" key={c.component_id}>
                    <span className={c.status === 'present' ? 'present' : c.status === 'missing' ? 'missing' : ''}>
                      {c.status === 'present' ? <Check size={12} /> : c.status === 'missing' ? <X size={12} /> : <CircleAlert size={12} />}
                    </span>
                    <span>
                      {c.name}
                      <small>{c.essential ? 'Essential' : 'Non-essential'} · {c.replaceable ? 'Replaceable' : 'Not replaceable'}</small>
                    </span>
                    <b>
                      {c.observed ?? '?'} / {c.expected}
                    </b>
                  </div>
                ))}
              </section>

              <section className="panel finding-panel">
                <div className="panel-head">
                  <div>
                    <small className="kicker">PHYSICAL CONDITION</small>
                    <h2>{similarity.is_auto_approved ? similarity.resolved_condition : (detail.condition?.amazon_condition || row.amazon_condition || 'Uncertain')}</h2>
                  </div>
                  <span className="grade">{similarity.is_auto_approved ? 'A' : (((detail.condition?.cosmetic_grade ?? row.amazon_condition ?? '?')).slice(0, 1).toUpperCase())}</span>
                </div>
                {similarity.is_auto_approved || (detail.judgment?.condition?.observations || []).length === 0 ? (
                  <div className="functional" style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={14} /> No defects observed &middot; Verified clean surface
                  </div>
                ) : (
                  (detail.judgment?.condition?.observations || []).map((defect, i) => (
                    <div className="defect" key={i}>
                      <span>
                        <CircleAlert size={15} />
                      </span>
                      <b>
                        {titleCase(defect.defect_type)}
                        <small>{defect.location_note} · {defect.severity} · confidence {defect.confidence ? defect.confidence.toFixed(2) : '1.0'}</small>
                      </b>
                    </div>
                  ))
                )}
                {(detail.condition?.listing_blockers || []).length > 0 && !similarity.is_auto_approved && (
                  <div className="functional">
                    <LockKeyhole size={14} /> Listing blockers: {(detail.condition?.listing_blockers || []).map(titleCase).join(', ')}
                  </div>
                )}
                <div className="functional">
                  <LockKeyhole size={14} /> Functional test not performed
                </div>
              </section>
            </>
          )}
        </div>

        <aside className="decision">
          <section className="panel decision-panel">
            <small className="kicker">03 / RECOMMENDED OUTCOME</small>
            <div className={`recommend-card ${(similarity.is_auto_approved ? similarity.recommended_disposition : (detail?.decision?.recommended_disposition || row.operator_disposition || similarity.recommended_disposition || 'pending_review')).toLowerCase()}`}>
              <div className="recommend-icon">
                <ShieldCheck size={20} />
              </div>
              <div className="recommend-body">
                <small className="label">Disposition recommendation</small>
                <b className="title">
                  {similarity.is_auto_approved
                    ? similarity.recommended_disposition.toUpperCase()
                    : detail?.decision?.recommended_disposition
                    ? dispositionLabel(detail.decision.recommended_disposition).toUpperCase()
                    : row.operator_disposition
                    ? dispositionLabel(row.operator_disposition).toUpperCase()
                    : 'PENDING REVIEW'}
                </b>
                <small className="sub">
                  {(() => {
                    const disp = similarity.is_auto_approved
                      ? similarity.recommended_disposition
                      : detail?.decision?.recommended_disposition || row.operator_disposition || similarity.recommended_disposition
                    if (disp === 'restock') return 'Item can go back on shelf'
                    if (disp === 'refurbish') return 'Item needs repair or repackaging'
                    if (disp === 'liquidate') return 'Sell at reduced value'
                    if (disp === 'dispose') return 'Item has no recoverable value'
                    if (disp === 'wrong_product') return 'Returned item differs from ordered catalog SKU'
                    return 'Requires operator review'
                  })()}
                </small>
              </div>
              <span className="recommend-rule-tag">{similarity.is_auto_approved ? (similarity.recommended_disposition === 'restock' ? 'AUTO-RESTOCK' : 'AUTO-APPROVED') : (detail?.decision?.rule_id || (row.sold_vs_returned_id_check?.startsWith('NOT MATCHED') ? 'R03-MISMATCH' : 'INSPECT'))}</span>
            </div>

            <div className="decision-facts">
              <div className="decision-fact-row">
                <span>Identity verification</span>
                <Pill value={similarity.is_auto_approved ? 'PASS' : (similarity.is_auto_rejected || similarity.recommended_disposition === 'wrong_product' || row.operator_disposition === 'wrong_product') ? 'FAIL' : (detail?.identity?.identity_match ?? row.identity_match)} />
              </div>
              <div className="decision-fact-row">
                <span>Parts completeness</span>
                <Pill value={titleCase((similarity.completeness_pct < 100 || row.parts_missing || similarity.is_auto_rejected || similarity.recommended_disposition === 'wrong_product') ? 'incomplete' : (detail?.completeness?.status ?? 'complete'))} />
              </div>
              <div className="decision-fact-row">
                <span>Condition grade</span>
                <b>{similarity.is_auto_approved ? similarity.resolved_condition : (detail?.condition?.amazon_condition ?? row.amazon_condition)}</b>
              </div>
              <div className="decision-fact-row">
                <span>Listing eligibility</span>
                <b style={{ color: (similarity.is_auto_approved && similarity.recommended_disposition === 'restock') || (detail ? detail.condition.relistable_as_is : row.operator_disposition === 'restock') ? '#34d399' : '#f87171' }}>
                  {(similarity.is_auto_approved && similarity.recommended_disposition === 'restock') || (detail ? detail.condition.relistable_as_is : row.operator_disposition === 'restock') ? 'Relistable as-is' : 'Not relistable as-is'}
                </b>
              </div>
            </div>

            <div className="why">
              <div className="why-header">
                <ShieldCheck size={14} />
                <span>Evaluation Rationale</span>
              </div>
              <p>
                {similarity.is_auto_approved
                  ? similarity.summary
                  : (detail?.decision?.reasons?.join('; ') ||
                    detail?.decision?.no_recommendation_reason ||
                    (row.sold_vs_returned_id_check?.startsWith('NOT MATCHED')
                      ? row.sold_vs_returned_id_check
                      : `Evaluated disposition for ${row.ordered_sku} (Condition: ${row.amazon_condition}, State: ${row.observed_state}).`))}
              </p>
              <small>
                {similarity.is_auto_approved
                  ? `Before vs After Product Evaluation · Confidence ${similarity.confidence}% >= 85%`
                  : `Rules engine · ${detail?.decision?.rules_version ?? 'batch-import-v1'} · confidence ${similarity.confidence}%`}
              </small>
            </div>

            {detail && Array.isArray(detail.decision?.expected_recovery_minor) && detail.decision.expected_recovery_minor.length > 0 && (
              <div className="recovery" style={{ padding: '12px 0', borderBottom: '1px solid var(--rm-border-subtle)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--rm-text-muted)' }}>Expected recovery per route</span>
                {detail.decision.expected_recovery_minor.map(([route, minor]) => (
                  <div key={route} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span>{dispositionLabel(route)}</span>
                    <b style={{ fontFamily: 'DM Mono', color: 'var(--rm-text-primary)' }}>{moneyMinor(minor, detail.decision.currency)}</b>
                  </div>
                ))}
                <small style={{ fontSize: '10px', color: 'var(--rm-text-muted)' }}>{detail.decision.synthetic_values ? 'Synthetic values' : 'Real values'}</small>
              </div>
            )}

            {similarity.is_auto_approved || ((row.confidence ?? 92) >= 85 && !row.sold_vs_returned_id_check?.startsWith('NOT MATCHED') && row.operator_disposition !== 'pending_review' && row.observed_state !== 'uncertain') ? (
              <div style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', marginTop: '12px', fontWeight: 500 }}>
                <CheckCircle2 size={14} /> Auto-approved (Confidence: {similarity.confidence}% &ge; 85%)
              </div>
            ) : (
              <>
                {(detail?.decision?.requires_review || row.operator_disposition === 'wrong_product' || row.operator_disposition === 'pending_review' || similarity.confidence < 85) && (
                  <div style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', marginTop: '12px' }}>
                    <CircleAlert size={14} /> Requires review: {detail?.decision?.review_reasons?.map(titleCase).join(', ') || (row.sold_vs_returned_id_check?.startsWith('NOT MATCHED') ? 'Paperwork mismatch' : `Low confidence (${similarity.confidence}% < 85%)`)}
                  </div>
                )}
                {(detail?.decision?.requires_signoff || row.operator_disposition === 'wrong_product') && (
                  <div style={{ color: 'var(--rm-text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', marginTop: '6px' }}>
                    <LockKeyhole size={14} /> Requires sign-off
                  </div>
                )}
              </>
            )}

            <div className="decision-actions">
              <button className="button primary" onClick={() => setModal('accept')}>
                <Check size={14} /> Accept recommendation
              </button>
              <button className="button" onClick={() => setModal('override')}>
                <ArrowRight size={14} /> Override decision
              </button>
              <button className="ghost-link" onClick={() => setModal('review_request')}>
                <Clock3 size={13} /> Request supervisor review
              </button>
            </div>
          </section>

          <div className="reviewer">
            <History decisions={decisions} />
          </div>
          <div className="audit-mini">
            <span>
              <i /> {decisions.length} decision(s) recorded
            </span>
            <Link to="/evidence">
              View audit <ArrowRight size={12} />
            </Link>
          </div>
        </aside>
      </div>
      <div className="inspection-foot">
        <ShieldCheck size={14} /> Recommendations support decisions; staff remain responsible for the final disposition.
      </div>
      {toast && (
        <div className="toast">
          <CheckCircle2 size={16} /> {toast}
        </div>
      )}
      <AnimatePresence>
        {modal && (
          <DecisionModal
            kind={modal}
            defaultDisposition={detail?.decision?.recommended_disposition || row.operator_disposition}
            onClose={() => setModal('')}
            onSubmit={(body) => submitDecision(modal, body)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function History({ decisions }: { decisions: Awaited<ReturnType<ReturnType<typeof useBatchStore>['getDecisions']>> }) {
  if (decisions.length === 0) {
    return <small>No decisions recorded yet for this row.</small>
  }
  return (
    <div className="decision-history">
      {decisions
        .slice()
        .reverse()
        .map((d, i) => (
          <div className="decision-entry" key={i}>
            <b>{d.action.replaceAll('_', ' ')}</b>
            <small>
              {d.actor} · {new Date(d.at * 1000).toLocaleString()}
            </small>
            <small>{d.reason}</small>
          </div>
        ))}
    </div>
  )
}
