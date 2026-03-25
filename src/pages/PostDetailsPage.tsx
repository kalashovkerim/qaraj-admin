import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { postsService } from '../services/posts'
import { sectionsService } from '../services/sections'
import { uploadService } from '../services/upload'
import type { SectionType } from '../types/api'
import { toAbsoluteImageUrl } from '../utils/url'

export function PostDetailsPage() {
  const { id } = useParams()
  const postId = Number(id)
  const queryClient = useQueryClient()
  const [sectionType, setSectionType] = useState<SectionType>('TEXT')
  const [textContent, setTextContent] = useState('')

  const postQuery = useQuery({
    queryKey: ['post', postId],
    queryFn: () => postsService.getById(postId),
    enabled: Number.isFinite(postId),
  })

  const sections = useMemo(
    () => [...(postQuery.data?.sections ?? [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [postQuery.data?.sections],
  )

  const createSectionMutation = useMutation({
    mutationFn: () => sectionsService.createForPost(postId, { type: sectionType, textContent }),
    onSuccess: () => {
      setTextContent('')
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
    },
  })

  const removeSectionMutation = useMutation({
    mutationFn: sectionsService.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['post', postId] }),
  })

  const addImageMutation = useMutation({
    mutationFn: async (args: { sectionId: number; file: File }) => {
      const url = await uploadService.uploadImage(args.file)
      return sectionsService.addImages(args.sectionId, { images: [{ imageUrl: url }] })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['post', postId] }),
  })

  const reorderSectionsMutation = useMutation({
    mutationFn: (items: Array<{ id: number; orderIndex: number }>) => sectionsService.reorder(postId, items),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['post', postId] }),
  })

  if (postQuery.isLoading) return <p>Loading post...</p>
  if (postQuery.isError || !postQuery.data) return <p className="text-rose-600">Post not found.</p>

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-2xl font-semibold text-slate-900">{postQuery.data.title}</h2>
        <p className="text-slate-600">{postQuery.data.description}</p>
      </div>

      <form
        className="grid gap-2 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault()
          createSectionMutation.mutate()
        }}
      >
        <select
          className="rounded-md border border-slate-300 px-3 py-2"
          value={sectionType}
          onChange={(e) => setSectionType(e.target.value as SectionType)}
        >
          <option value="TEXT">TEXT</option>
          <option value="IMAGE_COLLECTION">IMAGE_COLLECTION</option>
        </select>
        <input
          className="rounded-md border border-slate-300 px-3 py-2 md:col-span-2"
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          placeholder="Text content (for TEXT sections)"
        />
        <button className="rounded-md bg-slate-900 px-3 py-2 text-white md:col-span-3" type="submit">
          Add section
        </button>
      </form>

      <div className="space-y-3">
        {sections.map((section, index) => (
          <div key={section.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-medium text-slate-900">
                {index + 1}. {section.type}
              </p>
              <div className="flex gap-2">
                <button
                  className="rounded bg-slate-100 px-2 py-1 text-sm"
                  type="button"
                  onClick={() =>
                    reorderSectionsMutation.mutate(
                      sections.map((s, i) => ({
                        id: s.id,
                        orderIndex: s.id === section.id && i > 0 ? i - 1 : s.orderIndex,
                      })),
                    )
                  }
                >
                  Move up
                </button>
                <button
                  className="rounded bg-rose-100 px-2 py-1 text-sm text-rose-700"
                  type="button"
                  onClick={() => removeSectionMutation.mutate(section.id)}
                >
                  Delete section
                </button>
              </div>
            </div>
            {section.textContent && <p className="mb-3 text-slate-700">{section.textContent}</p>}
            {section.type === 'IMAGE_COLLECTION' && (
              <div className="space-y-2">
                <label className="block">
                  <span className="mb-1 block text-sm text-slate-600">Upload image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) addImageMutation.mutate({ sectionId: section.id, file })
                    }}
                  />
                </label>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {section.images
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((img) => (
                      <img
                        key={img.id}
                        src={toAbsoluteImageUrl(img.imageUrl)}
                        alt={img.altText ?? ''}
                        className="h-28 w-full rounded object-cover"
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
