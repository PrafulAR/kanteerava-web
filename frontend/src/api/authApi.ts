import apiClient from './axios'

export interface AuthUser {
  id: string
  email: string
  full_name: string
  phone: string
  role: string
  is_admin: boolean
  email_verified: boolean
  created_at: string
}

export interface LoginResponse {
  user: AuthUser
  access: string
  refresh: string
}

export interface VerificationChallenge {
  challenge: string
  masked_email: string
  cooldown_seconds: number
}

export interface PasswordResetGrant {
  grant: string
  reset_token: string
}

export const register = (payload: { full_name: string; email: string; password: string; confirm_password: string; phone?: string }) =>
  apiClient.post<{ data: VerificationChallenge }>('/auth/register/', payload)
export const verifyRegistration = (challenge: string, code: string) =>
  apiClient.post('/auth/registration/verify/', { challenge, code })
export const resendRegistrationCode = (challenge: string) =>
  apiClient.post<{ data: VerificationChallenge }>('/auth/registration/resend/', { challenge })
export const login = (email: string, password: string) => apiClient.post<{ data: LoginResponse }>('/auth/login/', { email, password })
export const requestPasswordReset = (email: string) =>
  apiClient.post<{ data: VerificationChallenge }>('/auth/password-reset/request/', { email })
export const verifyPasswordReset = (challenge: string, code: string) =>
  apiClient.post<{ data: PasswordResetGrant }>('/auth/password-reset/verify/', { challenge, code })
export const resendPasswordResetCode = (challenge: string) =>
  apiClient.post<{ data: VerificationChallenge }>('/auth/password-reset/resend/', { challenge })
export const completePasswordReset = (payload: PasswordResetGrant & { new_password: string; confirm_new_password: string }) =>
  apiClient.post('/auth/password-reset/complete/', payload)
export const googleLogin = (credential: string) =>
  apiClient.post<{ data: LoginResponse }>('/auth/google/', { credential })
export const logout = (accessToken: string) =>
  apiClient.post('/auth/logout/', {}, { headers: { Authorization: `Bearer ${accessToken}` } })
export const getCurrentUser = () => apiClient.get('/auth/me/')
