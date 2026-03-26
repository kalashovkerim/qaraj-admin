import { apiClient } from '../api/client';
import type {
  ApiEnvelope,
  Section,
  SectionImage,
  SectionType,
} from '../types/api';

export const sectionsService = {
  createForPost: async (
    postId: number,
    payload:
      | { type: 'TEXT'; textContent: string }
      | {
          type: 'IMAGE_COLLECTION'
          images?: Array<{ imageUrl: string; altText?: string }>
        }
  ) => {
    const { data } = await apiClient.post<ApiEnvelope<Section>>(
      `/admin/portfolio-posts/${postId}/sections`,
      payload
    );
    return data.data;
  },
  update: async (
    id: number,
    payload: { type?: SectionType; textContent?: string | null }
  ) => {
    const { data } = await apiClient.patch<ApiEnvelope<Section>>(
      `/admin/sections/${id}`,
      payload
    );
    return data.data;
  },
  remove: async (id: number) => {
    await apiClient.delete(`/admin/sections/${id}`);
  },
  reorder: async (
    postId: number,
    items: Array<{ id: number; orderIndex: number }>
  ) => {
    await apiClient.patch('/admin/sections/reorder', { postId, items });
  },
  addImages: async (
    sectionId: number,
    payload: {
      images: Array<{ imageUrl: string; altText?: string }>;
    }
  ) => {
    const { data } = await apiClient.post<ApiEnvelope<SectionImage[]>>(
      `/admin/sections/${sectionId}/images`,
      payload
    );
    return data.data;
  },
  reorderImages: async (
    sectionId: number,
    items: Array<{ id: number; orderIndex: number }>
  ) => {
    await apiClient.patch(`/admin/sections/${sectionId}/images/reorder`, {
      items,
    });
  },
  removeImage: async (sectionId: number, imageId: number) => {
    await apiClient.delete(`/admin/sections/${sectionId}/images/${imageId}`);
  },
};
