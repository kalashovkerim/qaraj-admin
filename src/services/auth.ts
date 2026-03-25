import { apiClient } from '../api/client'
import type { Admin, ApiEnvelope } from '../types/api'

type LoginResponse = ApiEnvelope<{ accessToken: string }>
type SetupResponse = ApiEnvelope<{ admin: Admin; accessToken: string }>

export const authService = {
  login: async (payload: { email: string; password: string }) => {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', payload)
    return data.data.accessToken
  },
  setup: async (payload: { email: string; password: string }) => {
    const { data } = await apiClient.post<SetupResponse>('/auth/setup', payload)
    return data.data
  },
  me: async () => {
    const { data } = await apiClient.get<ApiEnvelope<Admin>>('/admin/me')
    return data.data
  },
}
