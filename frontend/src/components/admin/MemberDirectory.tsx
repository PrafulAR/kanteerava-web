import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getDirectoryMember,
  getMemberDirectory,
  getWingMembers,
  type MemberType,
  type Membership,
} from '../../api/membershipApi'
import { WINGS, wingLabel } from '../../config/wings'
import { formatDate } from '../../utils/date'

interface DirectoryProps {
  wing?: MemberType
  memberId?: string
  onView: (id: string) => void
  onDownload: (id: string) => void
  onDelete: (id: string) => Promise<void>
}

export function MemberDirectory({ wing, memberId, onView, onDownload, onDelete }: DirectoryProps) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [members, setMembers] = useState<Membership[]>([])
  const [member, setMember] = useState<Membership | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (memberId && wing) {
      getDirectoryMember(wing, memberId)
        .then((response) => setMember(response.data.data))
        .catch(() => setError('Unable to load this member.'))
        .finally(() => setLoading(false))
      return
    }
    if (wing) return
    getMemberDirectory()
      .then((response) => setCounts(response.data.data.counts))
      .catch(() => setError('Unable to load the member directory.'))
      .finally(() => setLoading(false))
  }, [memberId, wing])

  useEffect(() => {
    if (!wing || memberId) return
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError('')
      getWingMembers(wing, search)
        .then((response) => setMembers(response.data.data))
        .catch(() => {
          setMembers([])
          setError('Unable to load members for this wing.')
        })
        .finally(() => setLoading(false))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [memberId, search, wing])

  if (memberId) {
    return <MemberDetails member={member} loading={loading} error={error} onView={onView} onDownload={onDownload} onDelete={onDelete} />
  }

  return (
    <section className="admin-panel member-directory" data-wing={wing}>
      <div className="directory-heading">
        <div>
          <p className="kicker">Admin workspace</p>
          <h1>{wing ? wingLabel(wing, true) : 'Member Directory'}</h1>
          <p>{wing ? 'Approved and active members in this wing.' : 'Browse active members by their Kanteerava wing.'}</p>
        </div>
        {wing && <Link className="outline-action wing-action" to="/admin/members">All wings</Link>}
      </div>

      {error && <p className="form-message error">{error}</p>}

      {!wing && (
        <div className="wing-grid">
          {WINGS.map((item) => (
            <article key={item.type} data-wing={item.type}>
              <span className="wing-card-mark" aria-hidden="true" />
              <p>{item.plural}</p>
              <strong>{loading ? '—' : counts[item.type] ?? 0}</strong>
              <span>Members</span>
              <Link to={`/admin/members/${item.type.toLowerCase()}`}>View members</Link>
            </article>
          ))}
        </div>
      )}

      {wing && (
        <>
          <label className="field-label" htmlFor="directory-search">Search directory</label>
          <input
            id="directory-search"
            className="directory-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search members by name, member ID, email or phone..."
          />
          <div className="table-scroll">
            <table className="member-table">
              <thead><tr><th>Member ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Wing</th><th>Actions</th></tr></thead>
              <tbody>
                {!loading && members.length === 0 && <tr><td colSpan={6}>No approved members found.</td></tr>}
                {members.map((item) => (
                  <tr key={item.application_id} data-wing={item.member_type}>
                    <td>{item.application_id}</td>
                    <td>{item.applicant_name || item.user_name}</td>
                    <td>{item.user_email}</td>
                    <td>{item.user_phone || 'Not provided'}</td>
                    <td><span className="wing-badge" data-wing={item.member_type}>{wingLabel(item.member_type)}</span></td>
                    <td><Link className="review-action wing-action" to={`/admin/members/${item.member_type.toLowerCase()}/${item.id}`}>View details</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

function MemberDetails({ member, loading, error, onView, onDownload, onDelete }: { member: Membership | null; loading: boolean; error: string; onView: (id: string) => void; onDownload: (id: string) => void; onDelete: (id: string) => Promise<void> }) {
  const navigate = useNavigate()
  const [deletionOpen, setDeletionOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deletionError, setDeletionError] = useState('')
  const deletionDialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!deletionOpen) return
    const dialog = deletionDialogRef.current
    if (!dialog) return
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
    const focusTimer = window.requestAnimationFrame(() => (focusable[0] ?? dialog).focus())

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deleting) {
        setDeletionOpen(false)
        setDeletionError('')
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
  }, [deleting, deletionOpen])
  if (loading) return <section className="admin-panel member-profile"><p>Loading member details...</p></section>
  if (error || !member) return <section className="admin-panel member-profile"><p className="form-message error">{error || 'Member not found.'}</p></section>

  const details = [
    { label: 'Member ID', value: member.member_id || member.application_id },
    { label: 'Applicant name', value: member.applicant_name || member.user_name },
    { label: 'Email', value: member.user_email },
    { label: 'Phone', value: member.user_phone || 'Not provided' },
    { label: 'Date of birth', value: formatDate(member.date_of_birth) || 'Not provided' },
    { label: 'Age', value: ageFromDate(member.date_of_birth) },
    { label: 'Address', value: member.address || 'Not provided', wide: true },
    { label: 'Parent / guardian', value: member.parent_or_guardian || 'Not provided' },
    { label: 'Emergency contact', value: member.emergency_contact_name || 'Not provided' },
    { label: 'Guardian phone', value: member.emergency_contact_phone || 'Not provided' },
    { label: 'Joining date', value: formatDate(member.joining_date) || 'Not provided' },
    { label: 'Registration date', value: formatDate(member.submitted_at) || 'Not provided' },
    { label: 'Membership status', value: member.status, status: true },
    { label: 'Previous experience', value: member.previous_experience || 'None', full: true },
  ]

  return (
    <section className="admin-panel member-profile" data-wing={member.member_type}>
      <div className="member-profile-heading">
        <div className="member-title-block">
          <p className="kicker">Member profile</p>
          <h1>{member.applicant_name || member.user_name}</h1>
          <span className="wing-badge" data-wing={member.member_type}>{wingLabel(member.member_type)}</span>
        </div>
        <Link className="outline-action wing-action" to={`/admin/members/${member.member_type.toLowerCase()}`}>Back to wing</Link>
      </div>
      <dl className="member-detail-grid">
        {details.map((detail) => <div className={`${detail.wide ? 'detail-wide' : ''}${detail.full ? ' detail-full' : ''}`} key={detail.label}><dt>{detail.label}</dt><dd>{detail.status ? <span className={`record-status status-${String(detail.value).toLowerCase()}`}>{detail.value}</span> : detail.value}</dd></div>)}
      </dl>
      {member.pdf_available && <div className="membership-document-actions"><span>Approved Membership Application</span><button className="review-action" type="button" onClick={() => onView(member.id)}>View Membership Form</button><button className="review-action" type="button" onClick={() => onDownload(member.id)}>Download PDF</button></div>}
      <section className="membership-danger-zone" aria-labelledby="member-danger-zone-title">
        <p className="kicker">Danger Zone</p>
        <h2 id="member-danger-zone-title">Delete Membership</h2>
        <p>Permanently remove this membership and its membership-specific records and documents. The website account will remain active.</p>
        <button className="review-action danger" type="button" onClick={() => { setDeletionError(''); setDeletionOpen(true) }}>Delete Membership</button>
      </section>
      {deletionOpen && <div className="approval-modal-backdrop" role="presentation"><div ref={deletionDialogRef} className="approval-modal deletion-modal" role="dialog" aria-modal="true" aria-labelledby="directory-delete-membership-title" tabIndex={-1}>
        <p className="kicker">Delete Membership</p><h2 id="directory-delete-membership-title">Permanently delete this membership?</h2>
        <p>You are about to permanently delete the membership of:</p>
        <div className="deletion-target"><strong>{member.applicant_name || member.user_name}</strong><span>{member.application_id}</span></div>
        <p>This removes the membership application, approved PDF, photo, signatures and membership access. Their website account will <strong>not</strong> be deleted, and they can log in and apply again.</p>
        <p><strong>This action cannot be undone.</strong></p>
        {deletionError && <p className="signature-error" role="alert">{deletionError}</p>}
        <div className="review-actions"><button className="review-action" type="button" disabled={deleting} onClick={() => { setDeletionOpen(false); setDeletionError('') }}>Cancel</button><button className="review-action danger destructive-action" type="button" disabled={deleting} onClick={async () => { setDeleting(true); setDeletionError(''); try { await onDelete(member.id); navigate(`/admin/members/${member.member_type.toLowerCase()}`) } catch { setDeletionError('Membership deletion could not be completed. Please try again.') } finally { setDeleting(false) } }}>{deleting ? 'Deleting Membership…' : 'Delete Membership Permanently'}</button></div>
      </div></div>}
    </section>
  )
}

function ageFromDate(value?: string) {
  if (!value) return 'Not provided'
  const birth = new Date(value)
  if (Number.isNaN(birth.getTime())) return 'Not provided'
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1
  return String(age)
}
