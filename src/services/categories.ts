import { apiClient } from '../api/client'
import type { ApiEnvelope, Category } from '../types/api'

export const categoriesService = {
  list: async () => {
    const { data } = await apiClient.get<ApiEnvelope<Category[]>>('/admin/categories')
    return data.data
  },
  create: async (payload: { name: string; slug?: string }) => {
    const { data } = await apiClient.post<ApiEnvelope<Category>>('/admin/categories', payload)
    return data.data
  },
  update: async (id: number, payload: { name?: string; slug?: string }) => {
    const { data } = await apiClient.patch<ApiEnvelope<Category>>(`/admin/categories/${id}`, payload)
    return data.data
  },
  remove: async (id: number) => {
    await apiClient.delete(`/admin/categories/${id}`)
  },
}
