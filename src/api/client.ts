import axios from 'axios'
import { tokenStore } from './token'

export const API_BASE_URL = 'http://157.173.101.84:5000/api/v1'
export const API_ORIGIN = new URL(API_BASE_URL).origin

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
})

apiClient.interceptors.request.use((config) => {
  const requestUrl = config.url ?? ''
  const isAuthEndpoint =
    requestUrl.includes('/auth/login') || requestUrl.includes('/auth/setup')

  if (isAuthEndpoint) {
    return config
  }

  const token = tokenStore.get()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
