import apiClient from './axios'

export interface GalleryAlbum {
  id: string
  title: string
  description: string
  is_published: boolean
  photo_count: number
  cover_image: string | null
  created_at: string
  updated_at?: string
}

export interface GalleryPhoto {
  id: string
  image: string
  caption: string
  event: string | null
  event_id: string | null
  event_title: string
  is_published: boolean
  uploaded_at: string
  updated_at?: string
}

const backendOrigin = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api').replace(/\/api\/?$/, '')

export const galleryImageUrl = (image: string) => image.startsWith('http://') || image.startsWith('https://') ? image : `${backendOrigin}${image}`

export const getGalleryAlbums = () => apiClient.get<{ data: GalleryAlbum[] }>('/gallery/albums/')
export const createGalleryAlbum = (payload: Pick<GalleryAlbum, 'title' | 'description' | 'is_published'>) => apiClient.post<{ data: GalleryAlbum }>('/gallery/albums/', payload)
export const updateGalleryAlbum = (id: string, payload: Partial<Pick<GalleryAlbum, 'title' | 'description' | 'is_published'>>) => apiClient.patch<{ data: GalleryAlbum }>(`/gallery/albums/${id}/`, payload)
export const deleteGalleryAlbum = (id: string) => apiClient.delete(`/gallery/albums/${id}/`)
export const getGalleryPhotos = (albumId: string) => apiClient.get<{ data: GalleryPhoto[] }>(`/gallery/albums/${albumId}/photos/`)
export const uploadGalleryPhoto = (albumId: string, payload: FormData) => apiClient.post<{ data: GalleryPhoto }>(`/gallery/albums/${albumId}/photos/`, payload, { headers: { 'Content-Type': 'multipart/form-data' } })
export const updateGalleryPhoto = (id: string, payload: Partial<Pick<GalleryPhoto, 'caption' | 'event' | 'is_published'>>) => apiClient.patch<{ data: GalleryPhoto }>(`/gallery/photos/${id}/`, payload)
export const deleteGalleryPhoto = (id: string) => apiClient.delete(`/gallery/photos/${id}/`)
