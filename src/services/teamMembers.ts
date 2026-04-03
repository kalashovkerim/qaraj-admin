import { apiClient } from '../api/client'
import type { ApiEnvelope, TeamMember } from '../types/api'

export const teamMembersService = {
  createForPost: async (
    postId: number,
    payload: { fullname: string; title: string },
  ) => {
    const { data } = await apiClient.post<ApiEnvelope<TeamMember>>(
      `/admin/portfolio-posts/${postId}/team-members`,
      payload,
    )
    return data.data
  },
  update: async (id: number, payload: { fullname: string; title: string }) => {
    const { data } = await apiClient.patch<ApiEnvelope<TeamMember>>(
      `/admin/team-members/${id}`,
      payload,
    )
    return data.data
  },
  remove: async (id: number) => {
    await apiClient.delete(`/admin/team-members/${id}`)
  },
}
