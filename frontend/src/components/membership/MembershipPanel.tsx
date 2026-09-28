import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { MemberType, Membership, MembershipResource } from '../../api/membershipApi'
import { GENDERS, GUARDIAN_TYPES, RELATIONSHIPS } from '../../config/membership'
import { WINGS, wingLabel } from '../../config/wings'
import { formatDate, todayInputValue } from '../../utils/date'
import { SignatureInput, type SignaturePayload } from './SignatureInput'
import { BsgResources } from './BsgResources'

export type MembershipApplication = {
  applicant_name: string; member_type: MemberType | ''; date_of_birth: string; gender: string; address: string
  emergency_contact_name: string; emergency_contact_phone: string; emergency_contact_relationship: string
  parent_or_guardian: string; guardian_type: 'FATHER' | 'MOTHER' | 'GUARDIAN' | ''; contact_phone: string; postal_code: string
  school_college: string; grade_section: string; hobbies: string; introduced_by: string
  previous_experience: string; joining_date: string; is_existing_member: boolean
  applicant_signature_upload: string; applicant_signature_name: string
  guardian_signature_upload: string; guardian_signature_name: string
  photo_upload: string; photo_name: string
  fee_acknowledged: boolean
}

interface MembershipPanelProps {
  membership: Membership | null; message: string; applicantEmail: string
  showApplication: boolean; application: MembershipApplication; onOpenApplication: () => void
  submitting: boolean
  onUpdateApplication: (field: keyof MembershipApplication, value: string | boolean) => void
  onSubmitApplication: (event: FormEvent) => void
  onSaveSignatures: (id: string, applicantSignature: SignaturePayload | null, guardianSignature: SignaturePayload | null) => Promise<void>
  onView: (id: string) => void; onDownload: (id: string) => void
  resources: MembershipResource[]; resourcesLoading: boolean; resourcesError: string
}

export function MembershipPanel(props: MembershipPanelProps) {
  const { membership, message, applicantEmail, showApplication, application, submitting, onOpenApplication, onUpdateApplication, onSubmitApplication, onSaveSignatures, onView, onDownload, resources, resourcesLoading, resourcesError } = props
  const [pendingApplicantSignature, setPendingApplicantSignature] = useState<SignaturePayload | null>(null)
  const [pendingGuardianSignature, setPendingGuardianSignature] = useState<SignaturePayload | null>(null)
  const [photoError, setPhotoError] = useState('')
  const [signatureError, setSignatureError] = useState('')
  const [savingSignature, setSavingSignature] = useState(false)
  const [acknowledgementError, setAcknowledgementError] = useState('')

  const submitApplication = (event: FormEvent) => {
    if (!application.fee_acknowledged) {
      event.preventDefault()
      setAcknowledgementError('Please acknowledge the membership fee declaration before submitting your application.')
      return
    }
    setAcknowledgementError('')
    onSubmitApplication(event)
  }

  const uploadPhoto = (file?: File) => {
    if (!file) return
    const extension = file.name.toLowerCase().split('.').pop()
    if (!['image/png', 'image/jpeg'].includes(file.type) || !['png', 'jpg', 'jpeg'].includes(extension ?? '') || file.size > 5_000_000) {
      onUpdateApplication('photo_upload', ''); onUpdateApplication('photo_name', '')
      setPhotoError('Choose a PNG or JPG photo under 5 MB.'); return
    }
    const reader = new FileReader()
    reader.onload = () => { onUpdateApplication('photo_upload', String(reader.result ?? '')); onUpdateApplication('photo_name', file.name); setPhotoError('') }
    reader.readAsDataURL(file)
  }

  const savePendingSignature = async () => {
    if (!membership || (!pendingApplicantSignature && !pendingGuardianSignature)) return
    setSavingSignature(true); setSignatureError('')
    try {
      await onSaveSignatures(membership.id, pendingApplicantSignature, pendingGuardianSignature)
      setPendingApplicantSignature(null); setPendingGuardianSignature(null)
    } catch { setSignatureError('Your signature could not be saved. Please try again.') }
    finally { setSavingSignature(false) }
  }

  const setSignature = (kind: 'applicant' | 'guardian', signature: SignaturePayload | null) => {
    onUpdateApplication(`${kind}_signature_upload` as keyof MembershipApplication, signature?.data ?? '')
    onUpdateApplication(`${kind}_signature_name` as keyof MembershipApplication, signature?.name ?? '')
  }

  return <>
    <section className="member-panel">
      <div className="panel-heading"><p className="kicker">Your place in the group</p><h2>Membership</h2></div>
      {message && <p className="form-message" role="status">{message}</p>}
      {!membership && <><p className="membership-copy">You have an account, but no active Scout or Guide membership yet.</p><button className="submit" type="button" onClick={onOpenApplication}>Apply for membership</button></>}
      {membership && <div className="membership-status" data-wing={membership.member_type}>
        <strong>{membership.application_id}</strong>
        <span className="wing-badge" data-wing={membership.member_type}>{wingLabel(membership.member_type)}</span>
        <span className={`status status-${membership.status.toLowerCase()}`}>{membership.status}</span>
        {membership.status === 'REJECTED' && <><p>{membership.rejection_reason || 'Your application was not approved.'} You can submit a new application when you are ready.</p><button className="submit" type="button" onClick={onOpenApplication}>Reapply for membership</button></>}
        {membership.status === 'PENDING' && <><p>Your application is currently under review. The official membership form will be available only after approval.</p>{(!membership.applicant_signature_available || !membership.guardian_signature_available) && <div className="membership-pending-signature"><p>Your application needs both required signatures before it can be approved.</p>{!membership.applicant_signature_available && <div className="pending-signature-block"><h3>Applicant Signature <RequiredMark /></h3><SignatureInput id="pending-applicant-signature" value={pendingApplicantSignature} onChange={setPendingApplicantSignature} /></div>}{!membership.guardian_signature_available && <div className="pending-signature-block"><h3>Parent / Guardian Signature <RequiredMark /></h3><SignatureInput id="pending-guardian-signature" value={pendingGuardianSignature} onChange={setPendingGuardianSignature} /></div>}{signatureError && <p className="signature-error" role="alert">{signatureError}</p>}<button className="review-action" type="button" disabled={(!pendingApplicantSignature && !pendingGuardianSignature) || savingSignature} onClick={savePendingSignature}>{savingSignature ? 'Saving…' : 'Save Signatures'}</button></div>}</>}
        {membership.status === 'APPROVED' && <><p>You are now an active {wingLabel(membership.member_type)}. {membership.approved_at && `Approved on ${formatDate(membership.approved_at)}.`}</p>{membership.pdf_available && <div className="membership-document-actions"><span>Membership Application</span><button className="review-action wing-action" type="button" onClick={() => onView(membership.id)}>View Membership Form</button><button className="review-action wing-action" type="button" onClick={() => onDownload(membership.id)}>Download PDF</button></div>}</>}
      </div>}
    </section>
    {showApplication && <section className="application-panel">
      <div className="panel-heading"><p className="kicker">New joinee application</p><h2>Tell us about you</h2></div>
      <form onSubmit={submitApplication}>
        <p className="required-fields-note"><RequiredMark /> Required fields</p>
        <label className="application-field application-field-wide"><span>Name of Applicant (In Block letters) <RequiredMark /></span><input className="block-letter-input" autoComplete="name" value={application.applicant_name} onChange={(event) => onUpdateApplication('applicant_name', event.target.value)} required /></label>
        <label className="application-field application-field-wide"><span>E-mail Id <RequiredMark /></span><input type="email" value={applicantEmail} readOnly required /></label>
        <div className="application-wing-helper"><Link to="/contact#scouting-journey" state={{ contextualBack: { label: 'Back to Membership Application', to: '/join' } }}>Not sure which section is right for you? See the Scouting Journey →</Link></div>
        <fieldset className="application-wing-picker application-field-wide">
          <legend>Wing / Section <RequiredMark /></legend>
          <div className="application-wing-options">
            {WINGS.map((wing) => <label className={application.member_type === wing.type ? 'is-selected' : ''} data-wing={wing.type} key={wing.type}><input type="radio" name="membership-wing" required value={wing.type} checked={application.member_type === wing.type} onChange={(event) => onUpdateApplication('member_type', event.target.value as MemberType)} /><span aria-hidden="true"/><strong>{wing.label}</strong></label>)}
          </div>
        </fieldset>
        <label className="application-field"><span>Father’s / Mother’s / Guardian’s Name <RequiredMark /></span><input required value={application.parent_or_guardian} onChange={(event) => onUpdateApplication('parent_or_guardian', event.target.value)} /></label>
        <label className="application-field"><span>Parent/Guardian Type <RequiredMark /></span><select required value={application.guardian_type} onChange={(event) => onUpdateApplication('guardian_type', event.target.value)}><option value="" disabled>Select parent/guardian type</option>{GUARDIAN_TYPES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
        <label className="application-field"><span>Date of Birth <RequiredMark /></span><input required type="date" max={todayInputValue()} value={application.date_of_birth} onChange={(event) => onUpdateApplication('date_of_birth', event.target.value)} /></label>
        <label className="application-field"><span>Gender <RequiredMark /></span><select required value={application.gender} onChange={(event) => onUpdateApplication('gender', event.target.value)}><option value="" disabled>Select gender</option>{GENDERS.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
        <label className="application-field application-field-wide"><span>Residential Address <RequiredMark /></span><textarea required value={application.address} onChange={(event) => onUpdateApplication('address', event.target.value)} /></label>
        <label className="application-field"><span>Contact Number(s) <RequiredMark /></span><input required type="tel" inputMode="tel" pattern={'(?=(?:\\D*\\d){7,15}\\D*$)[0-9+\\(\\) \\-]{7,30}'} title="Enter a valid phone number containing 7 to 15 digits" value={application.contact_phone} onChange={(event) => onUpdateApplication('contact_phone', event.target.value)} /></label>
        <label className="application-field"><span>PIN / Postal Code <RequiredMark /></span><input required autoComplete="postal-code" minLength={3} maxLength={12} pattern={'[A-Za-z0-9][A-Za-z0-9 \\x2D]{1,10}[A-Za-z0-9]'} title="Enter 3 to 12 letters, numbers, spaces or hyphens" value={application.postal_code} onChange={(event) => onUpdateApplication('postal_code', event.target.value)} /></label>
        <label className="application-field"><span>Father/Mother/Guardian <RequiredMark /></span><input required value={application.emergency_contact_name} onChange={(event) => onUpdateApplication('emergency_contact_name', event.target.value)} /></label>
        <label className="application-field"><span>Father/Mother/Guardian Contact Number <RequiredMark /></span><input required type="tel" inputMode="tel" pattern={'(?=(?:\\D*\\d){7,15}\\D*$)[0-9+\\(\\) \\-]{7,30}'} title="Enter a valid phone number containing 7 to 15 digits" value={application.emergency_contact_phone} onChange={(event) => onUpdateApplication('emergency_contact_phone', event.target.value)} /></label>
        <label className="application-field application-field-wide"><span>Relationship <RequiredMark /></span><select required value={application.emergency_contact_relationship} onChange={(event) => onUpdateApplication('emergency_contact_relationship', event.target.value)}><option value="" disabled>Select relationship</option>{RELATIONSHIPS.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
        <label className="application-field"><span>Name of School/College <RequiredMark /></span><input required value={application.school_college} onChange={(event) => onUpdateApplication('school_college', event.target.value)} /></label>
        <label className="application-field"><span>Grade &amp; Section <RequiredMark /></span><input required value={application.grade_section} onChange={(event) => onUpdateApplication('grade_section', event.target.value)} /></label>
        <label className="application-field application-field-wide"><span>Hobbies</span><textarea value={application.hobbies} onChange={(event) => onUpdateApplication('hobbies', event.target.value)} /></label>
        <label className="application-field"><span>Introduced By</span><input value={application.introduced_by} onChange={(event) => onUpdateApplication('introduced_by', event.target.value)} /></label>
        <label className="application-field"><span>Date</span><input type="text" value={formatDate(todayInputValue())} readOnly /></label>
        <label className="application-field"><span>Joining Date <RequiredMark /></span><input required type="date" max={todayInputValue()} value={application.joining_date} readOnly={!application.is_existing_member} aria-readonly={!application.is_existing_member} onChange={(event) => onUpdateApplication('joining_date', event.target.value)} /><small>{application.is_existing_member ? 'Enter your actual historical joining date.' : `Automatically assigned: ${formatDate(application.joining_date)}`}</small></label>
        <label className="application-existing-member application-field-wide"><input type="checkbox" checked={application.is_existing_member} onChange={(event) => { onUpdateApplication('is_existing_member', event.target.checked); onUpdateApplication('joining_date', event.target.checked ? '' : todayInputValue()) }} /> I am already a member of Kanteerava</label>
        <label className="application-field application-field-wide"><span>Previous Scout or Guide Experience</span><textarea value={application.previous_experience} onChange={(event) => onUpdateApplication('previous_experience', event.target.value)} /></label>
        <div className="application-upload-field"><label htmlFor="membership-photo">Member Photo <RequiredMark /> <small>(uniform not required)</small></label><input id="membership-photo" required={!application.photo_upload} type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" onChange={(event) => uploadPhoto(event.target.files?.[0])} />{application.photo_name && <small>Selected: {application.photo_name}</small>}{photoError && <small className="signature-error" role="alert">{photoError}</small>}</div>
        <div className="application-signature-field"><h3>Applicant Signature <RequiredMark /></h3><p>Draw with your mouse or finger, or upload a PNG/JPG signature.</p><SignatureInput id="applicant-signature" value={application.applicant_signature_upload ? { data: application.applicant_signature_upload, name: application.applicant_signature_name } : null} onChange={(signature) => setSignature('applicant', signature)} /></div>
        <div className="application-signature-field"><h3>Parent / Guardian Signature <RequiredMark /></h3><p>Draw with a mouse or finger, or upload a PNG/JPG signature.</p><SignatureInput id="guardian-signature" value={application.guardian_signature_upload ? { data: application.guardian_signature_upload, name: application.guardian_signature_name } : null} onChange={(signature) => setSignature('guardian', signature)} /></div>
        {(!application.photo_upload || !application.applicant_signature_upload || !application.guardian_signature_upload) && <p className="application-validation-hint" role="status">Add the required member photo and both signatures before submitting.</p>}
        <label className="application-fee-acknowledgement application-field-wide"><input type="checkbox" required checked={application.fee_acknowledged} onInvalid={() => setAcknowledgementError('Please acknowledge the membership fee declaration before submitting your application.')} onChange={(event) => { onUpdateApplication('fee_acknowledged', event.target.checked); if (event.target.checked) setAcknowledgementError('') }} /><span>I acknowledge that Kanteerava Open Unit does not charge any membership or joining fee. <RequiredMark /></span></label>
        {acknowledgementError && <p className="application-acknowledgement-error" role="alert">{acknowledgementError}</p>}
        <button className="submit" type="submit" disabled={submitting || !application.photo_upload || !application.applicant_signature_upload || !application.guardian_signature_upload}>{submitting ? 'Submitting application…' : 'Submit application'}</button>
      </form>
    </section>}
    {membership?.status === 'APPROVED' && <BsgResources resources={resources} loading={resourcesLoading} error={resourcesError} />}
  </>
}

function RequiredMark() { return <span className="required-mark" aria-hidden="true">*</span> }
