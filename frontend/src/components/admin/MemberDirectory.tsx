import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getDirectoryMember,
  getMemberDirectory,
  getWingMembers,
  type MemberType,
  type Membership,
} from '../../api/membershipApi'
import { WINGS, wingLabel } from '../../config/wings'

interface DirectoryProps {
  wing?: MemberType
  memberId?: string
  onView: (id: string) => void
  onDownload: (id: string) => void
}

export function MemberDirectory({ wing, memberId, onView, onDownload }: DirectoryProps) {
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
    return <MemberDetails member={member} loading={loading} error={error} onView={onView} onDownload={onDownload} />
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
                    <td>{item.user_name}</td>
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

function MemberDetails({ member, loading, error, onView, onDownload }: { member: Membership | null; loading: boolean; error: string; onView: (id: string) => void; onDownload: (id: string) => void }) {
  if (loading) return <section className="admin-panel member-profile"><p>Loading member details...</p></section>
  if (error || !member) return <section className="admin-panel member-profile"><p className="form-message error">{error || 'Member not found.'}</p></section>

  const details = [
    { label: 'Member ID', value: member.member_id || member.application_id },
    { label: 'Full name', value: member.user_name },
    { label: 'Email', value: member.user_email },
    { label: 'Phone', value: member.user_phone || 'Not provided' },
    { label: 'Date of birth', value: member.date_of_birth || 'Not provided' },
    { label: 'Age', value: ageFromDate(member.date_of_birth) },
    { label: 'Address', value: member.address || 'Not provided', wide: true },
    { label: 'Parent / guardian', value: member.parent_or_guardian || 'Not provided' },
    { label: 'Emergency contact', value: member.emergency_contact_name || 'Not provided' },
    { label: 'Guardian phone', value: member.emergency_contact_phone || 'Not provided' },
    { label: 'Registration date', value: member.submitted_at ? new Date(member.submitted_at).toLocaleDateString() : 'Not provided' },
    { label: 'Membership status', value: member.status, status: true },
    { label: 'Previous experience', value: member.previous_experience || 'None', full: true },
  ]

  return (
    <section className="admin-panel member-profile" data-wing={member.member_type}>
      <div className="member-profile-heading">
        <div className="member-title-block">
          <p className="kicker">Member profile</p>
          <h1>{member.user_name}</h1>
          <span className="wing-badge" data-wing={member.member_type}>{wingLabel(member.member_type)}</span>
        </div>
        <Link className="outline-action wing-action" to={`/admin/members/${member.member_type.toLowerCase()}`}>Back to wing</Link>
      </div>
      <dl className="member-detail-grid">
        {details.map((detail) => <div className={`${detail.wide ? 'detail-wide' : ''}${detail.full ? ' detail-full' : ''}`} key={detail.label}><dt>{detail.label}</dt><dd>{detail.status ? <span className={`record-status status-${String(detail.value).toLowerCase()}`}>{detail.value}</span> : detail.value}</dd></div>)}
      </dl>
      {member.pdf_available && <div className="membership-document-actions"><span>Approved Membership Application</span><button className="review-action" type="button" onClick={() => onView(member.id)}>View Membership Form</button><button className="review-action" type="button" onClick={() => onDownload(member.id)}>Download PDF</button></div>}
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
