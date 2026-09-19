import apiClient from './axios'

export interface AnnouncementItem {
  id: string
  title: string
  content_type: 'NOTICE' | 'STORY'
  category: string
  summary: string
  content: string
  author_name: string
  priority: 'NORMAL' | 'IMPORTANT' | 'URGENT'
  publish_date: string
  cover_image: string
  attachment: string
  target_wings: string[]
  is_pinned: boolean
  expires_at?: string | null
  is_published?: boolean
  created_at: string
  updated_at: string
}

export const getAnnouncements = () => apiClient.get<{ data: AnnouncementItem[] }>('/announcements/')
export const getAnnouncement = (id: string) => apiClient.get<{ data: AnnouncementItem }>(`/announcements/${id}/`)
export const createAnnouncement = (payload: FormData) => apiClient.post<{ data: AnnouncementItem }>('/announcements/', payload, { headers: { 'Content-Type': 'multipart/form-data' } })
export const updateAnnouncement = (id: string, payload: FormData) => apiClient.patch<{ data: AnnouncementItem }>(`/announcements/${id}/`, payload, { headers: { 'Content-Type': 'multipart/form-data' } })
export const deleteAnnouncement = (id: string) => apiClient.delete(`/announcements/${id}/`)

const backendOrigin = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api').replace(/\/api\/?$/, '')
export const newsroomFileUrl = (path: string) => path.startsWith('http://') || path.startsWith('https://') ? path : `${backendOrigin}${path}`
