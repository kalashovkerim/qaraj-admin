import { apiClient } from '../api/client'
import type { ApiEnvelope, PostDetail, PostSummary } from '../types/api'

type ListOptions = { isPublished?: 'true' | 'false' }

export const postsService = {
  list: async (options?: ListOptions) => {
    const { data } = await apiClient.get<ApiEnvelope<PostSummary[]>>('/admin/portfolio-posts', {
      params: options,
    })
    return data.data
  },
  create: async (payload: {
    title: string
    description: string
    preparationYear: number
    primaryImageUrl: string
    categoryId: number
    isPublished?: boolean
  }) => {
    const { data } = await apiClient.post<ApiEnvelope<PostSummary>>('/admin/portfolio-posts', payload)
    return data.data
  },
  getById: async (id: number) => {
    const { data } = await apiClient.get<ApiEnvelope<PostDetail>>(`/admin/portfolio-posts/${id}`)
    return data.data
  },
  update: async (
    id: number,
    payload: Partial<{
      title: string
      description: string
      preparationYear: number
      primaryImageUrl: string
      categoryId: number
      isPublished: boolean
    }>,
  ) => {
    const { data } = await apiClient.patch<ApiEnvelope<PostSummary>>(
      `/admin/portfolio-posts/${id}`,
      payload,
    )
    return data.data
  },
  remove: async (id: number) => {
    await apiClient.delete(`/admin/portfolio-posts/${id}`)
  },
  reorder: async (items: Array<{ id: number; orderIndex: number }>) => {
    await apiClient.patch('/admin/portfolio-posts/reorder', { items })
  },
}
