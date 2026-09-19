import apiClient from './axios'

export type MembershipStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type MemberType = 'SCOUT' | 'GUIDE' | 'CUB' | 'BULBUL' | 'ROVER' | 'RANGER' | 'ALUMNI' | 'LEADER'

export interface Membership {
  id: string
  application_id: string
  user_name: string
  user_email: string
  user_phone: string
  member_id: string
  pdf_available: boolean
  applicant_signature_available: boolean
  member_type: MemberType
  status: MembershipStatus
  date_of_birth: string
  gender: string
  address: string
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact_relationship: string
  parent_or_guardian: string
  contact_phone: string
  postal_code: string
  school_college: string
  grade_section: string
  hobbies: string
  introduced_by: string
  preferred_patrol: string
  previous_experience: string
  applicant_signature_upload?: string
  applicant_signature_name?: string
  photo_upload?: string
  photo_name?: string
  joining_date: string | null
  rejection_reason: string
  submitted_at: string
  approved_at: string | null
}

export type MembershipApplicationInput = Pick<Membership, 'member_type' | 'date_of_birth' | 'gender' | 'address' | 'emergency_contact_name' | 'emergency_contact_phone' | 'emergency_contact_relationship' | 'parent_or_guardian' | 'contact_phone' | 'postal_code' | 'school_college' | 'grade_section' | 'hobbies' | 'introduced_by' | 'preferred_patrol' | 'previous_experience'> & {
  joining_date: string | null
  applicant_signature_upload: string
  applicant_signature_name: string
  photo_upload: string
  photo_name: string
}

export const getMemberships = () => apiClient.get<{ data: Membership[] }>('/memberships/')
export const applyForMembership = (payload: MembershipApplicationInput) => apiClient.post<{ data: Membership }>('/memberships/apply/', payload)
export const getAdminDashboard = () => apiClient.get<{ data: AdminSummary }>('/memberships/admin-dashboard/')
export const approveMembership = (id: string, signature: { data: string; name: string }) => apiClient.post<{ data: Membership }>(`/memberships/${id}/approve/`, { authorized_signature: signature.data, authorized_signature_name: signature.name })
export const rejectMembership = (id: string, rejection_reason: string) => apiClient.post<{ data: Membership }>(`/memberships/${id}/reject/`, { rejection_reason })
export const updateMembership = (id: string, payload: Partial<Membership>) => apiClient.patch<{ data: Membership }>(`/memberships/${id}/`, payload)
export const getMembershipPdf = (id: string, download = false) => apiClient.get<Blob>(`/memberships/${id}/pdf/`, { responseType: 'blob', params: download ? { download: 1 } : undefined })
export const getMemberDirectory = () => apiClient.get<{ data: { counts: Record<MemberType, number> } }>('/memberships/directory/')
export const getWingMembers = (wing: MemberType, search = '') => apiClient.get<{ data: Membership[] }>(`/memberships/directory/${wing}/`, { params: search ? { search } : undefined })
export const getDirectoryMember = (wing: MemberType, id: string) => apiClient.get<{ data: Membership }>(`/memberships/directory/${wing}/${id}/`)

export interface AdminSummary {
  total_members: number
  total_scouts: number
  total_guides: number
  total_cubs: number
  total_bulbuls: number
  total_rovers: number
  total_rangers: number
  total_alumni: number
  total_leaders: number
  pending_applications: number
  upcoming_events: number
}
