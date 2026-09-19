import apiClient from './axios'

export interface AchievementItem { id: string; title: string; description: string; achievement_date: string; category: string; recipient: string; image?: string | null; is_published?: boolean }
export const getAchievements = () => apiClient.get<{ data: AchievementItem[] }>('/achievements/')
export const createAchievement = (payload: FormData) => apiClient.post('/achievements/', payload, { headers: { 'Content-Type': 'multipart/form-data' } })
export const updateAchievement = (id: string, payload: Partial<AchievementItem> | FormData) => apiClient.patch(`/achievements/${id}/`, payload, payload instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined)

const backendOrigin = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api').replace(/\/api\/?$/, '')
export const achievementImageUrl = (image: string) => image.startsWith('http://') || image.startsWith('https://') ? image : `${backendOrigin}${image}`
export const deleteAchievement = (id: string) => apiClient.delete(`/achievements/${id}/`)
