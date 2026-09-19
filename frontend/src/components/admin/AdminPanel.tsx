import { useState } from 'react'
import { isAxiosError } from 'axios'
import { Link } from 'react-router-dom'
import type { AdminSummary, Membership } from '../../api/membershipApi'
import { WINGS, wingLabel } from '../../config/wings'
import { SignatureInput, type SignaturePayload } from '../membership/SignatureInput'

interface AdminPanelProps {
  summary: AdminSummary
  message: string
  applications: Membership[]
  onApprove: (id: string, signature: SignaturePayload) => Promise<Membership>
  onReject: (id: string, reason: string) => Promise<void>
  onUpdate: (id: string, payload: Partial<Membership>) => Promise<Membership | void>
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

export function AdminPanel({ summary, message, applications, onApprove, onReject, onUpdate, onView, onDownload, view = 'overview' }: AdminPanelProps) {
  const [selected, setSelected] = useState<Membership | null>(null)
  const [draft, setDraft] = useState<Partial<Membership>>({})
  const [rejectionReason, setRejectionReason] = useState('')
  const [applicationSearch, setApplicationSearch] = useState('')
  const [approvalOpen, setApprovalOpen] = useState(false)
  const [authorizedSignature, setAuthorizedSignature] = useState<SignaturePayload | null>(null)
  const [approving, setApproving] = useState(false)
  const [approvalError, setApprovalError] = useState('')

  const visibleApplications = applications.filter((application) => application.status !== 'REJECTED')
  const normalizedSearch = applicationSearch.trim().toLocaleLowerCase()
  const filteredApplications = normalizedSearch
    ? visibleApplications.filter((application) => [
        application.application_id,
        application.member_id,
        application.user_name,
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
    setApprovalOpen(false)
    setAuthorizedSignature(null)
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
        <span><strong>{item.user_name}</strong><small>{item.application_id} / <b className="wing-label">{wingLabel(item.member_type)}</b> / {item.status}</small></span>
        <button className="review-action" type="button" onClick={() => selectApplication(item)}>View details</button>
      </div>)}
    </div>
    {selected && <div className="application-review">
      <div className="review-header"><h3>{selected.application_id}</h3><button className="review-close" type="button" onClick={() => setSelected(null)}>Close</button></div>
      <div className="membership-review-status"><span className={`status status-${selected.status.toLowerCase()}`}>{selected.status}</span>{selected.approved_at && <span>Approved on {new Date(selected.approved_at).toLocaleDateString()}</span>}{selected.status === 'PENDING' && <span>Applicant signature: {selected.applicant_signature_available ? 'Received' : 'Missing'}</span>}</div>
      <div className="review-fields">
        <strong>Applicant</strong><span>{selected.user_name} / {selected.user_email}</span>
        <label>Member type<select className="wing-select" data-wing={draft.member_type ?? selected.member_type} disabled={selected.status !== 'PENDING'} value={draft.member_type ?? selected.member_type} onChange={(event) => update('member_type', event.target.value)}>{WINGS.map((wing) => <option key={wing.type} value={wing.type}>{wing.label}</option>)}</select></label>
        <label>Date of birth<input disabled={selected.status !== 'PENDING'} type="date" value={draft.date_of_birth ?? selected.date_of_birth} onChange={(event) => update('date_of_birth', event.target.value)} /></label>
        <label>Gender<input disabled={selected.status !== 'PENDING'} value={draft.gender ?? selected.gender} onChange={(event) => update('gender', event.target.value)} /></label>
        <label>Address<textarea disabled={selected.status !== 'PENDING'} value={draft.address ?? selected.address} onChange={(event) => update('address', event.target.value)} /></label>
        <label>Emergency contact<input disabled={selected.status !== 'PENDING'} value={draft.emergency_contact_name ?? selected.emergency_contact_name} onChange={(event) => update('emergency_contact_name', event.target.value)} /></label>
        <label>Emergency phone<input disabled={selected.status !== 'PENDING'} value={draft.emergency_contact_phone ?? selected.emergency_contact_phone} onChange={(event) => update('emergency_contact_phone', event.target.value)} /></label>
        <label>Relationship<input disabled={selected.status !== 'PENDING'} value={draft.emergency_contact_relationship ?? selected.emergency_contact_relationship} onChange={(event) => update('emergency_contact_relationship', event.target.value)} /></label>
        <label>Parent/guardian<input disabled={selected.status !== 'PENDING'} value={draft.parent_or_guardian ?? selected.parent_or_guardian} onChange={(event) => update('parent_or_guardian', event.target.value)} /></label>
        <label>Contact phone<input disabled={selected.status !== 'PENDING'} value={draft.contact_phone ?? selected.contact_phone} onChange={(event) => update('contact_phone', event.target.value)} /></label>
        <label>Pin code<input disabled={selected.status !== 'PENDING'} value={draft.postal_code ?? selected.postal_code} onChange={(event) => update('postal_code', event.target.value)} /></label>
        <label>School or college<input disabled={selected.status !== 'PENDING'} value={draft.school_college ?? selected.school_college} onChange={(event) => update('school_college', event.target.value)} /></label>
        <label>Grade and section<input disabled={selected.status !== 'PENDING'} value={draft.grade_section ?? selected.grade_section} onChange={(event) => update('grade_section', event.target.value)} /></label>
        <label>Hobbies<input disabled={selected.status !== 'PENDING'} value={draft.hobbies ?? selected.hobbies} onChange={(event) => update('hobbies', event.target.value)} /></label>
        <label>Introduced by<input disabled={selected.status !== 'PENDING'} value={draft.introduced_by ?? selected.introduced_by} onChange={(event) => update('introduced_by', event.target.value)} /></label>
        <label>Preferred patrol<input disabled={selected.status !== 'PENDING'} value={draft.preferred_patrol ?? selected.preferred_patrol} onChange={(event) => update('preferred_patrol', event.target.value)} /></label>
        <label>Joining date<input disabled={selected.status !== 'PENDING'} type="date" value={draft.joining_date ?? selected.joining_date ?? ''} onChange={(event) => update('joining_date', event.target.value)} /></label>
        <label>Previous experience<textarea disabled={selected.status !== 'PENDING'} value={draft.previous_experience ?? selected.previous_experience} onChange={(event) => update('previous_experience', event.target.value)} /></label>
      </div>
      {selected.status === 'PENDING' && <textarea className="rejection-reason" placeholder="Rejection reason (optional)" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} />}
      <div className="review-actions">
        {selected.status === 'PENDING' && <>
          <button className="review-action" type="button" onClick={async () => { const updated = await onUpdate(selected.id, draft); if (updated) { setSelected(updated); setDraft(updated) } }}>Save corrections</button>
          <button className="review-action danger" type="button" onClick={async () => { await onReject(selected.id, rejectionReason); setSelected(null) }}>Reject</button>
          <button className="submit" type="button" onClick={() => { setApprovalError(''); setAuthorizedSignature(null); setApprovalOpen(true) }}>Approve application</button>
        </>}
        {selected.status === 'APPROVED' && selected.pdf_available && <><button className="review-action" type="button" onClick={() => onView(selected.id)}>View Membership Form</button><button className="review-action" type="button" onClick={() => onDownload(selected.id)}>Download PDF</button></>}
      </div>
    </div>}
    {approvalOpen && selected && <div className="approval-modal-backdrop" role="presentation"><div className="approval-modal" role="dialog" aria-modal="true" aria-labelledby="approval-modal-title">
      <p className="kicker">Approve Membership</p><h2 id="approval-modal-title">Authorized approval</h2>
      <p><strong>Applicant:</strong> {selected.user_name}<br /><strong>Application No:</strong> {selected.application_id}</p>
      <label className="field-label">Authorized Signature</label>
      <SignatureInput id="authorized-signature" value={authorizedSignature} onChange={setAuthorizedSignature} />
      {approvalError && <p className="signature-error" role="alert">{approvalError}</p>}
      <div className="review-actions"><button className="review-action" type="button" disabled={approving} onClick={() => { setApprovalOpen(false); setAuthorizedSignature(null) }}>Cancel</button><button className="submit" type="button" disabled={!authorizedSignature || approving || !selected.applicant_signature_available} onClick={confirmApproval}>{approving ? 'Creating official form…' : 'Approve Membership'}</button></div>
      {!selected.applicant_signature_available && <p className="signature-error">The applicant must add their signature before approval.</p>}
    </div></div>}
  </section>
}
