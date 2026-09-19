import apiClient from './axios'

export interface EventItem {
  id: string
  title: string
  category: string
  short_summary: string
  description: string
  location: string
  address: string
  maps_link: string
  start_date: string
  end_date: string | null
  eligible_wings: string[]
  organizer: string
  maximum_participants: number | null
  registration_status: 'OPEN' | 'CLOSED'
  event_image: string
  poster: string
  circular: string
  instructions: string
  registration_link: string
  registration_deadline: string | null
  registration_details: string
  contact_person: string
  contact_phone: string
  contact_email: string
  contact_instructions: string
  is_published?: boolean
  registration_count: number
}

export const getEvents = () => apiClient.get<{ data: EventItem[] }>('/events/')
export const getEvent = (id: string) => apiClient.get<{ data: EventItem }>(`/events/${id}/`)
export const createEvent = (payload: FormData) => apiClient.post<{ data: EventItem }>('/events/', payload, { headers: { 'Content-Type': 'multipart/form-data' } })
export const updateEvent = (id: string, payload: FormData) => apiClient.patch<{ data: EventItem }>(`/events/${id}/`, payload, { headers: { 'Content-Type': 'multipart/form-data' } })
export const deleteEvent = (id: string) => apiClient.delete(`/events/${id}/`)

const backendOrigin = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api').replace(/\/api\/?$/, '')
export const eventFileUrl = (path: string) => path.startsWith('http://') || path.startsWith('https://') ? path : `${backendOrigin}${path}`
