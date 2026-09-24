import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('scout_access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const refreshToken = localStorage.getItem('scout_refresh_token')
    if (error.response?.status === 401 && refreshToken && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const response = await axios.post(`${apiClient.defaults.baseURL}/auth/token/refresh/`, { refresh: refreshToken })
        localStorage.setItem('scout_access_token', response.data.access)
        originalRequest.headers.Authorization = `Bearer ${response.data.access}`
        return apiClient(originalRequest)
      } catch {
        localStorage.removeItem('scout_access_token')
        localStorage.removeItem('scout_refresh_token')
        window.dispatchEvent(new Event('scout-auth-expired'))
      }
    }
    return Promise.reject(error)
  },
)

export default apiClient
