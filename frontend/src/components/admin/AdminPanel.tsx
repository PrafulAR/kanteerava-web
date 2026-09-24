import { useEffect, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { Link } from 'react-router-dom'
import type { AdminSummary, Membership } from '../../api/membershipApi'
import { WINGS, wingLabel } from '../../config/wings'
import { GENDERS, GUARDIAN_TYPES, RELATIONSHIPS } from '../../config/membership'
import { formatDate } from '../../utils/date'
import { SignatureInput, type SignaturePayload } from '../membership/SignatureInput'

interface AdminPanelProps {
  summary: AdminSummary
  message: string
  applications: Membership[]
  onApprove: (id: string, signature: SignaturePayload) => Promise<Membership>
  onReject: (id: string, reason: string) => Promise<void>
  onUpdate: (id: string, payload: Partial<Membership>) => Promise<Membership | void>
  onDelete: (id: string) => Promise<void>
  onView: (id: string) => void
  onDownload: (id: string) => Promise<void>
  view?: 'overview' | 'applications'
}

const workspaces = [
  { title: 'Membership Applications', description: 'Review and manage new membership requests.', action: 'Open workspace', to: '/admin/applications', stat: (summary: AdminSummary) => `${summary.pending_applications} pending` },
  { title: 'Member Directory', description: 'Browse members by wing and open individual member profiles.', action: 'Open directory', to: '/admin/members', stat: (summary: AdminSummary) => `${summary.total_members} members` },
  { title: 'Gallery', description: 'Create albums, upload photos, edit albums and manage gallery content.', action: 'Open gallery', to: '/admin/gallery' },
  { title: 'Achievements', description: 'Add, edit and manage group achievements and recognitions.', action: 'Open achievements', to: '/admin/achievements' },
  { title: 'Events', description: 'Create, publish and manage upcoming and past events.', action: 'Open events', to: '/admin/events' },
  { title: 'Newsroom', description: 'Create and manage notices, updates, reports and stories.', action: 'Open newsroom', to: '/admin/newsroom' },
] as const

export function AdminPanel({ summary, message, applications, onApprove, onReject, onUpdate, onDelete, onView, onDownload, view = 'overview' }: AdminPanelProps) {
  const [selected, setSelected] = useState<Membership | null>(null)
  const [draft, setDraft] = useState<Partial<Membership>>({})
  const [rejectionReason, setRejectionReason] = useState('')
  const [applicationSearch, setApplicationSearch] = useState('')
  const [approvalOpen, setApprovalOpen] = useState(false)
  const [authorizedSignature, setAuthorizedSignature] = useState<SignaturePayload | null>(null)
  const [approving, setApproving] = useState(false)
  const [approvalError, setApprovalError] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [rejectionError, setRejectionError] = useState('')
  const [deletionOpen, setDeletionOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deletionError, setDeletionError] = useState('')
  const approvalDialogRef = useRef<HTMLDivElement>(null)
  const deletionDialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!approvalOpen && !deletionOpen) return

    const dialog = approvalOpen ? approvalDialogRef.current : deletionDialogRef.current
    if (!dialog) return
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
    const focusTimer = window.requestAnimationFrame(() => (focusable[0] ?? dialog).focus())

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (approvalOpen && !approving) {
          setApprovalOpen(false)
          setAuthorizedSignature(null)
        }
        if (deletionOpen && !deleting) {
          setDeletionOpen(false)
          setDeletionError('')
        }
        return
      }
      if (event.key !== 'Tab') return
      const currentFocusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
      if (currentFocusable.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const first = currentFocusable[0]
      const last = currentFocusable[currentFocusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [approvalOpen, approving, deleting, deletionOpen])

  const visibleApplications = applications.filter((application) => application.status !== 'REJECTED')
  const normalizedSearch = applicationSearch.trim().toLocaleLowerCase()
  const filteredApplications = normalizedSearch
    ? visibleApplications.filter((application) => [
        application.application_id,
        application.member_id,
        application.applicant_name,
        application.user_email,
        application.user_phone,
        application.member_type,
        wingLabel(application.member_type),
        application.status,
      ].some((value) => String(value ?? '').toLocaleLowerCase().includes(normalizedSearch)))
    : visibleApplications

  const selectApplication = (application: Membership) => {
    setSelected(application)
    setDraft(application)
    setRejectionReason('')
    setRejectionError('')
    setApprovalOpen(false)
    setAuthorizedSignature(null)
    setDeletionOpen(false)
    setDeletionError('')
  }

  const update = (field: keyof Membership, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  const confirmApproval = async () => {
    if (!selected || !authorizedSignature) return
    setApproving(true)
    setApprovalError('')
    try {
      const updated = await onApprove(selected.id, authorizedSignature)
      setSelected(updated)
      setDraft(updated)
      setApprovalOpen(false)
      setAuthorizedSignature(null)
    } catch (error) {
      setApprovalError(isAxiosError(error) && typeof error.response?.data?.message === 'string' ? error.response.data.message : 'Approval could not be completed. The application remains pending; please try again.')
    } finally {
      setApproving(false)
    }
  }

  const confirmDeletion = async () => {
    if (!selected) return
    setDeleting(true)
    setDeletionError('')
    try {
      await onDelete(selected.id)
      setDeletionOpen(false)
      setSelected(null)
    } catch (error) {
      setDeletionError(isAxiosError(error) && typeof error.response?.data?.message === 'string' ? error.response.data.message : 'Membership deletion could not be completed. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const confirmRejection = async () => {
    if (!selected) return
    setRejecting(true)
    setRejectionError('')
    try {
      await onReject(selected.id, rejectionReason)
      setSelected(null)
    } catch (error) {
      setRejectionError(isAxiosError(error) && typeof error.response?.data?.message === 'string' ? error.response.data.message : 'This application could not be rejected. Please try again.')
    } finally {
      setRejecting(false)
    }
  }

  if (view === 'overview') return <section className="admin-panel admin-dashboard" id="admin">
    <div className="panel-heading"><p className="kicker">Admin workspace</p><h2>Group overview</h2></div>
    {message && <p className="form-message" role="status">{message}</p>}
    <div className="metric-grid" aria-label="Group membership overview">
      <div className="metric-total"><strong>{summary.total_members}</strong><span>Total Members</span></div>
      <div data-wing="SCOUT"><strong>{summary.total_scouts}</strong><span>Scouts</span></div>
      <div data-wing="GUIDE"><strong>{summary.total_guides}</strong><span>Guides</span></div>
      <div data-wing="CUB"><strong>{summary.total_cubs}</strong><span>Cubs</span></div>
      <div data-wing="BULBUL"><strong>{summary.total_bulbuls}</strong><span>Bulbuls</span></div>
      <div data-wing="ROVER"><strong>{summary.total_rovers}</strong><span>Rovers</span></div>
      <div data-wing="RANGER"><strong>{summary.total_rangers}</strong><span>Rangers</span></div>
      <div data-wing="ALUMNI"><strong>{summary.total_alumni}</strong><span>Life Members</span></div>
      <div data-wing="LEADER"><strong>{summary.total_leaders}</strong><span>Leaders</span></div>
      <div><strong>{summary.pending_applications}</strong><span>Pending</span></div>
    </div>
    <div className="admin-workspace-heading"><p className="kicker">Management areas</p><h2>Choose a workspace.</h2><p>Open a focused area to manage Kanteerava records and content.</p></div>
    <nav className="admin-workspace-grid" aria-label="Admin workspaces">
      {workspaces.map((workspace) => {
        const stat = 'stat' in workspace ? workspace.stat(summary) : undefined
        return <Link className="admin-workspace-card" to={workspace.to} key={workspace.to}>
          <span className="admin-workspace-card-label">Admin workspace</span>
          <h3>{workspace.title}</h3>
          <p>{workspace.description}</p>
          {stat && <strong>{stat}</strong>}
          <span className="admin-workspace-card-action">{workspace.action} →</span>
        </Link>
      })}
    </nav>
  </section>

  return <section className="admin-panel applications-admin" id="membership-applications">
    <div className="panel-heading"><p className="kicker">Admin workspace</p><h2>Membership Applications</h2><p>Review and manage new membership requests.</p></div>
    {message && <p className="form-message" role="status">{message}</p>}
    <div className="application-search-block">
      <label className="field-label" htmlFor="application-search">Search applications</label>
      <div className="application-search-control">
        <input id="application-search" type="search" value={applicationSearch} onChange={(event) => setApplicationSearch(event.target.value)} placeholder="Search by application number, name, email, phone, wing or status..." />
        {applicationSearch && <button type="button" onClick={() => setApplicationSearch('')} aria-label="Clear application search">Clear</button>}
      </div>
      <p className="application-search-count" aria-live="polite">{normalizedSearch ? `${filteredApplications.length} of ${visibleApplications.length} applications found` : `${visibleApplications.length} applications`}</p>
    </div>
    <div className="review-list">
      <h3>Membership applications</h3>
      {visibleApplications.length === 0 && <p className="membership-copy">No applications yet.</p>}
      {visibleApplications.length > 0 && filteredApplications.length === 0 && <p className="membership-copy">No applications match “{applicationSearch.trim()}”.</p>}
      {filteredApplications.map((item) => <div className="review-row" data-wing={item.member_type} key={item.id}>
        <span><strong>{item.applicant_name || item.user_name}</strong><small>{item.application_id} / <b className="wing-label">{wingLabel(item.member_type)}</b> / {item.status}</small></span>
        <button className="review-action" type="button" onClick={() => selectApplication(item)}>View details</button>
      </div>)}
    </div>
    {selected && <div className="application-review">
      <div className="review-header"><h3>{selected.application_id}</h3><button className="review-close" type="button" onClick={() => setSelected(null)}>Close</button></div>
      <div className="membership-review-status"><span className={`status status-${selected.status.toLowerCase()}`}>{selected.status}</span>{selected.approved_at && <span>Approved on {formatDate(selected.approved_at)}</span>}{selected.status === 'PENDING' && <><span>Applicant Signature: {selected.applicant_signature_available ? 'Received' : 'Missing'}</span><span>Parent / Guardian Signature: {selected.guardian_signature_available ? 'Received' : 'Missing'}</span></>}</div>
      <div className="review-fields">
        <label className="review-field-wide">Name of Applicant (In Block letters)<input className="block-letter-input" disabled={selected.status !== 'PENDING'} value={(draft.applicant_name ?? selected.applicant_name) || selected.user_name} onChange={(event) => update('applicant_name', event.target.value)} /></label>
        <label>E-mail Id<input disabled value={selected.user_email} /></label>
        <label>Wing / Section<select className="wing-select" data-wing={draft.member_type ?? selected.member_type} disabled={selected.status !== 'PENDING'} value={draft.member_type ?? selected.member_type} onChange={(event) => update('member_type', event.target.value)}>{WINGS.map((wing) => <option key={wing.type} value={wing.type}>{wing.label}</option>)}</select></label>
        <label>Father’s / Guardian’s Name<input disabled={selected.status !== 'PENDING'} value={draft.parent_or_guardian ?? selected.parent_or_guardian} onChange={(event) => update('parent_or_guardian', event.target.value)} /></label>
        <label>Parent/Guardian Type<select disabled={selected.status !== 'PENDING'} value={draft.guardian_type ?? selected.guardian_type ?? ''} onChange={(event) => update('guardian_type', event.target.value)}><option value="">Not provided</option>{GUARDIAN_TYPES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
        <label>Date of Birth<input disabled={selected.status !== 'PENDING'} type="date" value={draft.date_of_birth ?? selected.date_of_birth} onChange={(event) => update('date_of_birth', event.target.value)} /></label>
        <label>Gender<select disabled={selected.status !== 'PENDING'} value={draft.gender ?? selected.gender} onChange={(event) => update('gender', event.target.value)}><option value="">Select gender</option>{GENDERS.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
        <label>Residential Address<textarea disabled={selected.status !== 'PENDING'} value={draft.address ?? selected.address} onChange={(event) => update('address', event.target.value)} /></label>
        <label>Contact Number(s)<input disabled={selected.status !== 'PENDING'} value={draft.contact_phone ?? selected.contact_phone} onChange={(event) => update('contact_phone', event.target.value)} /></label>
        <label>Father/Mother/Guardian<input disabled={selected.status !== 'PENDING'} value={draft.emergency_contact_name ?? selected.emergency_contact_name} onChange={(event) => update('emergency_contact_name', event.target.value)} /></label>
        <label>Father/Mother/Guardian Contact Number<input disabled={selected.status !== 'PENDING'} value={draft.emergency_contact_phone ?? selected.emergency_contact_phone} onChange={(event) => update('emergency_contact_phone', event.target.value)} /></label>
        <label>Relationship<select disabled={selected.status !== 'PENDING'} value={draft.emergency_contact_relationship ?? selected.emergency_contact_relationship} onChange={(event) => update('emergency_contact_relationship', event.target.value)}><option value="">Select relationship</option>{RELATIONSHIPS.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
        <label>Pin Code<input disabled={selected.status !== 'PENDING'} value={draft.postal_code ?? selected.postal_code} onChange={(event) => update('postal_code', event.target.value)} /></label>
        <label>Name of School/College<input disabled={selected.status !== 'PENDING'} value={draft.school_college ?? selected.school_college} onChange={(event) => update('school_college', event.target.value)} /></label>
        <label>Grade &amp; Section<input disabled={selected.status !== 'PENDING'} value={draft.grade_section ?? selected.grade_section} onChange={(event) => update('grade_section', event.target.value)} /></label>
        <label>Hobbies<input disabled={selected.status !== 'PENDING'} value={draft.hobbies ?? selected.hobbies} onChange={(event) => update('hobbies', event.target.value)} /></label>
        <label>Introduced By<input disabled={selected.status !== 'PENDING'} value={draft.introduced_by ?? selected.introduced_by} onChange={(event) => update('introduced_by', event.target.value)} /></label>
        <label>Joining Date<input disabled={selected.status !== 'PENDING'} type="date" value={draft.joining_date ?? selected.joining_date ?? ''} onChange={(event) => update('joining_date', event.target.value)} /></label>
        <label>Previous Scout or Guide Experience<textarea disabled={selected.status !== 'PENDING'} value={draft.previous_experience ?? selected.previous_experience} onChange={(event) => update('previous_experience', event.target.value)} /></label>
      </div>
      {selected.status === 'PENDING' && <textarea className="rejection-reason" placeholder="Rejection reason (optional)" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} />}
      {rejectionError && <p className="signature-error" role="alert">{rejectionError}</p>}
      <div className="review-actions">
        {selected.status === 'PENDING' && <>
          <button className="review-action" type="button" onClick={async () => { const updated = await onUpdate(selected.id, draft); if (updated) { setSelected(updated); setDraft(updated) } }}>Save corrections</button>
          <button className="review-action danger" type="button" disabled={rejecting} onClick={confirmRejection}>{rejecting ? 'Rejecting…' : 'Reject'}</button>
          <button className="submit" type="button" onClick={() => { setApprovalError(''); setAuthorizedSignature(null); setApprovalOpen(true) }}>Approve application</button>
        </>}
        {selected.status === 'APPROVED' && selected.pdf_available && <><button className="review-action" type="button" onClick={() => onView(selected.id)}>View Membership Form</button><button className="review-action" type="button" onClick={() => onDownload(selected.id)}>Download PDF</button></>}
      </div>
      <section className="membership-danger-zone" aria-labelledby="application-danger-zone-title">
        <p className="kicker">Danger Zone</p>
        <h4 id="application-danger-zone-title">Delete Membership</h4>
        <p>Permanently remove this membership, its application, signatures, photo and approved document. The website account will remain active.</p>
        <button className="review-action danger" type="button" onClick={() => { setDeletionError(''); setDeletionOpen(true) }}>Delete Membership</button>
      </section>
    </div>}
    {approvalOpen && selected && <div className="approval-modal-backdrop" role="presentation"><div ref={approvalDialogRef} className="approval-modal" role="dialog" aria-modal="true" aria-labelledby="approval-modal-title" tabIndex={-1}>
      <p className="kicker">Approve Membership</p><h2 id="approval-modal-title">Authorized approval</h2>
      <p><strong>Applicant:</strong> {selected.applicant_name || selected.user_name}<br /><strong>Application No:</strong> {selected.application_id}</p>
      <label className="field-label">Authorized Signature</label>
      <SignatureInput id="authorized-signature" value={authorizedSignature} onChange={setAuthorizedSignature} />
      {approvalError && <p className="signature-error" role="alert">{approvalError}</p>}
      <div className="review-actions"><button className="review-action" type="button" disabled={approving} onClick={() => { setApprovalOpen(false); setAuthorizedSignature(null) }}>Cancel</button><button className="submit" type="button" disabled={!authorizedSignature || approving || !selected.applicant_signature_available || !selected.guardian_signature_available} onClick={confirmApproval}>{approving ? 'Creating official form…' : 'Approve Membership'}</button></div>
      {(!selected.applicant_signature_available || !selected.guardian_signature_available) && <p className="signature-error">Both Applicant Signature and Parent / Guardian Signature are required before approval.</p>}
    </div></div>}
    {deletionOpen && selected && <div className="approval-modal-backdrop" role="presentation"><div ref={deletionDialogRef} className="approval-modal deletion-modal" role="dialog" aria-modal="true" aria-labelledby="delete-membership-title" tabIndex={-1}>
      <p className="kicker">Delete Membership</p><h2 id="delete-membership-title">Permanently delete this membership?</h2>
      <p>You are about to permanently delete the membership of:</p>
      <div className="deletion-target"><strong>{selected.applicant_name || selected.user_name}</strong><span>{selected.application_id}</span></div>
      <p>This removes the membership application, approved PDF, photo, signatures and membership access. Their website account will <strong>not</strong> be deleted, and they can log in and apply again.</p>
      <p><strong>This action cannot be undone.</strong></p>
      {deletionError && <p className="signature-error" role="alert">{deletionError}</p>}
      <div className="review-actions"><button className="review-action" type="button" disabled={deleting} onClick={() => { setDeletionOpen(false); setDeletionError('') }}>Cancel</button><button className="review-action danger destructive-action" type="button" disabled={deleting} onClick={confirmDeletion}>{deleting ? 'Deleting Membership…' : 'Delete Membership Permanently'}</button></div>
    </div></div>}
  </section>
}
