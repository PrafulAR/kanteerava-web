import apiClient from './axios'

export interface AuthUser {
  id: string
  email: string
  full_name: string
  phone: string
  role: string
  is_admin: boolean
}

export interface LoginResponse {
  user: AuthUser
  access: string
  refresh: string
}

export const register = (payload: Record<string, string>) => apiClient.post('/auth/register/', payload)
export const login = (email: string, password: string) => apiClient.post<{ data: LoginResponse }>('/auth/login/', { email, password })
export const getCurrentUser = () => apiClient.get('/auth/me/')
