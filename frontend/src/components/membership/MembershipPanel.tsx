import { useState } from 'react'
import type { FormEvent } from 'react'
import type { MemberType, Membership } from '../../api/membershipApi'
import { WINGS, wingLabel } from '../../config/wings'
import { SignatureInput, type SignaturePayload } from './SignatureInput'

type Application = { member_type: MemberType; date_of_birth: string; gender: string; address: string; emergency_contact_name: string; emergency_contact_phone: string; emergency_contact_relationship: string; parent_or_guardian: string; contact_phone: string; postal_code: string; school_college: string; grade_section: string; hobbies: string; introduced_by: string; preferred_patrol: string; previous_experience: string; joining_date: string; applicant_signature_upload: string; applicant_signature_name: string; photo_upload: string; photo_name: string }

interface MembershipPanelProps {
  membership: Membership | null
  message: string
  showApplication: boolean
  application: Application
  onOpenApplication: () => void
  onUpdateApplication: (field: keyof Application, value: string) => void
  onSubmitApplication: (event: FormEvent) => void
  onSaveSignature: (id: string, signature: SignaturePayload) => Promise<void>
  onView: (id: string) => void
  onDownload: (id: string) => void
}

export function MembershipPanel({ membership, message, showApplication, application, onOpenApplication, onUpdateApplication, onSubmitApplication, onSaveSignature, onView, onDownload }: MembershipPanelProps) {
  const [pendingSignature, setPendingSignature] = useState<SignaturePayload | null>(null)
  const [photoError, setPhotoError] = useState('')
  const [signatureError, setSignatureError] = useState('')
  const [savingSignature, setSavingSignature] = useState(false)

  const uploadPhoto = (file?: File) => {
    if (!file) return
    const extension = file.name.toLowerCase().split('.').pop()
    if (!['image/png', 'image/jpeg'].includes(file.type) || !['png', 'jpg', 'jpeg'].includes(extension ?? '') || file.size > 5_000_000) {
      onUpdateApplication('photo_upload', '')
      onUpdateApplication('photo_name', '')
      setPhotoError('Choose a PNG or JPG photo under 5 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      onUpdateApplication('photo_upload', String(reader.result ?? ''))
      onUpdateApplication('photo_name', file.name)
      setPhotoError('')
    }
    reader.readAsDataURL(file)
  }

  const savePendingSignature = async () => {
    if (!membership || !pendingSignature) return
    setSavingSignature(true)
    setSignatureError('')
    try {
      await onSaveSignature(membership.id, pendingSignature)
      setPendingSignature(null)
    } catch {
      setSignatureError('Your signature could not be saved. Please try again.')
    } finally {
      setSavingSignature(false)
    }
  }
  return <>
    <section className="member-panel">
      <div className="panel-heading"><p className="kicker">Your place in the group</p><h2>Membership</h2></div>
      {message && <p className="form-message" role="status">{message}</p>}
      <a className="membership-leader-link" href="/contact#leaders">Not sure which section is right for you? Talk to a Leader →</a>
      {!membership && <><p className="membership-copy">You have an account, but no active Scout or Guide membership yet.</p><button className="submit" type="button" onClick={onOpenApplication}>Apply for membership</button></>}
      {membership && <div className="membership-status" data-wing={membership.member_type}>
        <strong>{membership.application_id}</strong>
        <span className="wing-badge" data-wing={membership.member_type}>{wingLabel(membership.member_type)}</span>
        <span className={`status status-${membership.status.toLowerCase()}`}>{membership.status}</span>
        {membership.status === 'REJECTED' && <><p>{membership.rejection_reason || 'Your application was not approved.'} You can submit a new application when you are ready.</p><button className="submit" type="button" onClick={onOpenApplication}>Reapply for membership</button></>}
        {membership.status === 'PENDING' && <><p>Your application is currently under review. The official membership form will be available only after approval.</p>
          {!membership.applicant_signature_available && <div className="membership-pending-signature"><p>Your application needs your signature before it can be approved.</p><SignatureInput id="pending-applicant-signature" value={pendingSignature} onChange={setPendingSignature} />{signatureError && <p className="signature-error" role="alert">{signatureError}</p>}<button className="review-action" type="button" disabled={!pendingSignature || savingSignature} onClick={savePendingSignature}>{savingSignature ? 'Saving…' : 'Save Signature'}</button></div>}
        </>}
        {membership.status === 'APPROVED' && <><p>You are now an active {wingLabel(membership.member_type)}. {membership.approved_at && `Approved on ${new Date(membership.approved_at).toLocaleDateString()}.`}</p>{membership.pdf_available && <div className="membership-document-actions"><span>Membership Application</span><button className="review-action wing-action" type="button" onClick={() => onView(membership.id)}>View Membership Form</button><button className="review-action wing-action" type="button" onClick={() => onDownload(membership.id)}>Download PDF</button></div>}</>}
      </div>}
    </section>
    {showApplication && <section className="application-panel">
      <div className="panel-heading"><p className="kicker">New joinee application</p><h2>Tell us about you</h2></div>
      <form onSubmit={onSubmitApplication}>
        <select className="wing-select" data-wing={application.member_type} value={application.member_type} onChange={(event) => onUpdateApplication('member_type', event.target.value as MemberType)}>{WINGS.map((wing) => <option key={wing.type} value={wing.type}>{wing.label}</option>)}</select>
        <input required type="date" value={application.date_of_birth} onChange={(event) => onUpdateApplication('date_of_birth', event.target.value)} />
        <input placeholder="Gender" value={application.gender} onChange={(event) => onUpdateApplication('gender', event.target.value)} />
        <input placeholder="Contact phone" type="tel" value={application.contact_phone} onChange={(event) => onUpdateApplication('contact_phone', event.target.value)} />
        <textarea required placeholder="Home address" value={application.address} onChange={(event) => onUpdateApplication('address', event.target.value)} />
        <input placeholder="Pin code" value={application.postal_code} onChange={(event) => onUpdateApplication('postal_code', event.target.value)} />
        <input required placeholder="Emergency contact name" value={application.emergency_contact_name} onChange={(event) => onUpdateApplication('emergency_contact_name', event.target.value)} />
        <input required placeholder="Emergency contact phone" value={application.emergency_contact_phone} onChange={(event) => onUpdateApplication('emergency_contact_phone', event.target.value)} />
        <input required placeholder="Relationship" value={application.emergency_contact_relationship} onChange={(event) => onUpdateApplication('emergency_contact_relationship', event.target.value)} />
        <input placeholder="Parent or guardian" value={application.parent_or_guardian} onChange={(event) => onUpdateApplication('parent_or_guardian', event.target.value)} />
        <input placeholder="School or college" value={application.school_college} onChange={(event) => onUpdateApplication('school_college', event.target.value)} />
        <input placeholder="Grade and section" value={application.grade_section} onChange={(event) => onUpdateApplication('grade_section', event.target.value)} />
        <input placeholder="Hobbies" value={application.hobbies} onChange={(event) => onUpdateApplication('hobbies', event.target.value)} />
        <input placeholder="Introduced by" value={application.introduced_by} onChange={(event) => onUpdateApplication('introduced_by', event.target.value)} />
        <input placeholder="Preferred patrol or group" value={application.preferred_patrol} onChange={(event) => onUpdateApplication('preferred_patrol', event.target.value)} />
        <textarea placeholder="Previous Scout or Guide experience" value={application.previous_experience} onChange={(event) => onUpdateApplication('previous_experience', event.target.value)} />
        <div className="application-upload-field"><label htmlFor="membership-photo">Member photo (optional; uniform not required)</label><input id="membership-photo" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" onChange={(event) => uploadPhoto(event.target.files?.[0])} />{application.photo_name && <small>Selected: {application.photo_name}</small>}{photoError && <small className="signature-error" role="alert">{photoError}</small>}</div>
        <div className="application-signature-field"><h3>Your Signature</h3><p>Draw with your mouse or finger, or upload a PNG/JPG signature.</p><SignatureInput id="applicant-signature" value={application.applicant_signature_upload ? { data: application.applicant_signature_upload, name: application.applicant_signature_name } : null} onChange={(signature) => { onUpdateApplication('applicant_signature_upload', signature?.data ?? ''); onUpdateApplication('applicant_signature_name', signature?.name ?? '') }} /></div>
        <button className="submit" type="submit" disabled={!application.applicant_signature_upload}>Submit application</button>
      </form>
    </section>}
  </>
}
