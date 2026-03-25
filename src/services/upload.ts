import { apiClient } from '../api/client'
import type { ApiEnvelope } from '../types/api'
import { toAbsoluteImageUrl } from '../utils/url'

export const uploadService = {
  uploadImage: async (file: File) => {
    const formData = new FormData()
    formData.append('image', file)
    const { data } = await apiClient.post<ApiEnvelope<{ url: string }>>('/admin/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return toAbsoluteImageUrl(data.data.url)
  },
}
