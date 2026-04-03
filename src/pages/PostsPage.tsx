import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { categoriesService } from '../services/categories'
import { postsService } from '../services/posts'
import { uploadService } from '../services/upload'
import type { PostSummary } from '../types/api'
import { toAbsoluteImageUrl } from '../utils/url'

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function SortablePostRow({
  post,
  onDelete,
  onTogglePublished,
  isToggling,
  onEdit,
}: {
  post: PostSummary
  onDelete: (id: number) => void
  onTogglePublished: (post: PostSummary, nextPublished: boolean) => void
  isToggling: boolean
  onEdit: (post: PostSummary) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: post.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-[40px_1fr_auto] items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"
    >
      <button className="cursor-grab text-slate-400" type="button" {...attributes} {...listeners}>
        ::
      </button>
      <Link to={`/admin/posts/${post.id}`} className="min-w-0">
        <p className="truncate font-medium text-slate-900">{post.title}</p>
        <p className="truncate text-sm text-slate-500">{post.slug}</p>
      </Link>
      <div className="flex items-center gap-2">
        <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={post.isPublished}
            disabled={isToggling}
            onChange={(e) => onTogglePublished(post, e.target.checked)}
          />
          Published
        </label>
        <button
          className="rounded-md bg-slate-100 px-2.5 py-1.5 text-sm text-slate-700"
          type="button"
          onClick={() => onEdit(post)}
        >
          Edit
        </button>
        <button
          className="rounded-md bg-rose-100 px-2.5 py-1.5 text-sm text-rose-700"
          type="button"
          onClick={() => onDelete(post.id)}
        >
          Delete
        </button>
      </div>
    </div>
  )
}

export function PostsPage() {
  const queryClient = useQueryClient()
  const [editingPostId, setEditingPostId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    preparationYear: new Date().getFullYear(),
    primaryImageUrl: '',
    categoryId: 0,
  })
  const [form, setForm] = useState({
    title: '',
    description: '',
    preparationYear: new Date().getFullYear(),
    primaryImageUrl: '',
    categoryId: 1,
    isPublished: false,
  })
  const sensors = useSensors(useSensor(PointerSensor))

  const postsQuery = useQuery({
    queryKey: ['posts'],
    queryFn: () => postsService.list(),
  })

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesService.list,
  })

  const createMutation = useMutation({
    mutationFn: postsService.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  })

  const uploadPrimaryImageMutation = useMutation({
    mutationFn: (file: File) => uploadService.uploadImage(file),
    onSuccess: (url) => setForm((prev) => ({ ...prev, primaryImageUrl: url })),
  })

  const deleteMutation = useMutation({
    mutationFn: postsService.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  })

  const updatePostMutation = useMutation({
    mutationFn: (args: {
      id: number
      payload: {
        title: string
        description: string
        preparationYear: number
        primaryImageUrl: string
        categoryId: number
      }
    }) => postsService.update(args.id, args.payload),
    onSuccess: () => {
      setEditingPostId(null)
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })

  const uploadEditPrimaryImageMutation = useMutation({
    mutationFn: (file: File) => uploadService.uploadImage(file),
    onSuccess: (url) => setEditForm((prev) => ({ ...prev, primaryImageUrl: url })),
  })

  const togglePublishedMutation = useMutation({
    mutationFn: ({ id, isPublished }: { id: number; isPublished: boolean }) =>
      postsService.update(id, { isPublished }),
    onMutate: async ({ id, isPublished }) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] })
      const prev = queryClient.getQueryData<PostSummary[]>(['posts']) ?? []
      queryClient.setQueryData<PostSummary[]>(
        ['posts'],
        prev.map((post) => (post.id === id ? { ...post, isPublished } : post)),
      )
      return { prev }
    },
    onError: (_error, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['posts'], context.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  })

  const reorderMutation = useMutation({
    mutationFn: postsService.reorder,
    onMutate: async (items) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] })
      const prev = queryClient.getQueryData<PostSummary[]>(['posts']) ?? []
      const map = new Map(items.map((item) => [item.id, item.orderIndex]))
      const optimistic = [...prev].sort((a, b) => (map.get(a.id) ?? a.orderIndex) - (map.get(b.id) ?? b.orderIndex))
      queryClient.setQueryData(['posts'], optimistic)
      return { prev }
    },
    onError: (_error, _items, context) => {
      if (context?.prev) queryClient.setQueryData(['posts'], context.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  })

  const posts = useMemo(
    () => [...(postsQuery.data ?? [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [postsQuery.data],
  )
  const effectiveCategoryId = useMemo(() => {
    const categories = categoriesQuery.data ?? []
    if (!categories.length) return 0
    const hasCurrent = categories.some((category) => category.id === form.categoryId)
    return hasCurrent ? form.categoryId : categories[0].id
  }, [categoriesQuery.data, form.categoryId])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = posts.findIndex((p) => p.id === active.id)
    const newIndex = posts.findIndex((p) => p.id === over.id)
    const moved = arrayMove(posts, oldIndex, newIndex)
    reorderMutation.mutate(moved.map((item, index) => ({ id: item.id, orderIndex: index })))
  }

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold text-slate-900">Portfolio Posts</h2>
      <form
        className="grid gap-2 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          createMutation.mutate({ ...form, categoryId: effectiveCategoryId })
        }}
      >
        <input className="rounded-md border px-3 py-2" placeholder="Title" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} required />
        <div className="space-y-2">
          <input
            className="rounded-md border px-3 py-2"
            placeholder="Primary image URL (or upload a file)"
            value={form.primaryImageUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, primaryImageUrl: e.target.value }))}
            required
          />
          <label className="block text-sm text-slate-600">
            Upload primary image
            <input
              className="mt-1 block w-full text-sm"
              type="file"
              accept="image/*"
              disabled={uploadPrimaryImageMutation.isPending}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadPrimaryImageMutation.mutate(file)
              }}
            />
          </label>
          {uploadPrimaryImageMutation.isError && (
            <p className="text-sm text-rose-600">Failed to upload image.</p>
          )}
          {form.primaryImageUrl && (
            <img
              src={toAbsoluteImageUrl(form.primaryImageUrl)}
              alt="Primary preview"
              className="h-24 w-full rounded border border-slate-200 bg-white object-cover"
            />
          )}
        </div>
        <input className="rounded-md border px-3 py-2 md:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} required />
        <input className="rounded-md border px-3 py-2" type="number" value={form.preparationYear} onChange={(e) => setForm((prev) => ({ ...prev, preparationYear: Number(e.target.value) }))} />
        <select
          className="rounded-md border px-3 py-2"
          value={effectiveCategoryId}
          onChange={(e) => setForm((prev) => ({ ...prev, categoryId: Number(e.target.value) }))}
          disabled={categoriesQuery.isLoading || !categoriesQuery.data?.length}
        >
          {!categoriesQuery.data?.length ? (
            <option value={0}>No categories available</option>
          ) : (
            categoriesQuery.data.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))
          )}
        </select>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((prev) => ({ ...prev, isPublished: e.target.checked }))} />
          Published
        </label>
        {categoriesQuery.isError && (
          <p className="text-sm text-rose-600 md:col-span-2">Failed to load categories.</p>
        )}
        <button
          className="flex items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-white md:col-span-2 disabled:opacity-50"
          type="submit"
          disabled={!categoriesQuery.data?.length || createMutation.isPending}
        >
          {createMutation.isPending && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}
          {createMutation.isPending ? 'Creating...' : 'Create post'}
        </button>
      </form>

      {postsQuery.isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-slate-900" />
            <span className="text-sm text-slate-500">Loading posts...</span>
          </div>
        </div>
      )}
      {postsQuery.isError && <p className="text-rose-600">Failed to load posts.</p>}

      {!postsQuery.isLoading && !postsQuery.isError && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={posts.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              {posts.map((post) => (
                <SortablePostRow
                  key={post.id}
                  post={post}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onEdit={(item) => {
                    setEditingPostId(item.id)
                    setEditForm({
                      title: item.title,
                      description: item.description,
                      preparationYear: item.preparationYear,
                      primaryImageUrl: item.primaryImageUrl,
                      categoryId: item.categoryId,
                    })
                  }}
                  onTogglePublished={(currentPost, nextPublished) =>
                    togglePublishedMutation.mutate({
                      id: currentPost.id,
                      isPublished: nextPublished,
                    })
                  }
                  isToggling={
                    togglePublishedMutation.isPending &&
                    togglePublishedMutation.variables?.id === post.id
                  }
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {editingPostId !== null && (
        <form
          className="grid gap-2 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            updatePostMutation.mutate({
              id: editingPostId,
              payload: {
                title: editForm.title,
                description: editForm.description,
                preparationYear: editForm.preparationYear,
                primaryImageUrl: editForm.primaryImageUrl,
                categoryId: editForm.categoryId,
              },
            })
          }}
        >
          <div>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={editForm.title}
              placeholder="Title"
              onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <p className="mt-1 text-xs text-slate-500">Slug preview: {slugify(editForm.title) || '-'}</p>
          </div>
          <input
            className="rounded-md border px-3 py-2"
            type="number"
            value={editForm.preparationYear}
            onChange={(e) =>
              setEditForm((prev) => ({ ...prev, preparationYear: Number(e.target.value) }))
            }
          />
          <input
            className="rounded-md border px-3 py-2 md:col-span-2"
            value={editForm.description}
            placeholder="Description"
            onChange={(e) =>
              setEditForm((prev) => ({ ...prev, description: e.target.value }))
            }
          />
          <div className="space-y-2">
            <input
              className="w-full rounded-md border px-3 py-2"
              value={editForm.primaryImageUrl}
              placeholder="Primary image URL"
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, primaryImageUrl: e.target.value }))
              }
            />
            <label className="block text-sm text-slate-600">
              Upload new primary image
              <input
                className="mt-1 block w-full text-sm"
                type="file"
                accept="image/*"
                disabled={uploadEditPrimaryImageMutation.isPending}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadEditPrimaryImageMutation.mutate(file)
                }}
              />
            </label>
            {editForm.primaryImageUrl && (
              <img
                src={toAbsoluteImageUrl(editForm.primaryImageUrl)}
                alt="Primary preview"
                className="h-24 w-full rounded border border-slate-200 object-cover"
              />
            )}
          </div>
          <select
            className="rounded-md border px-3 py-2"
            value={editForm.categoryId}
            onChange={(e) => setEditForm((prev) => ({ ...prev, categoryId: Number(e.target.value) }))}
            disabled={categoriesQuery.isLoading || !categoriesQuery.data?.length}
          >
            {(categoriesQuery.data ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2 md:col-span-2">
            <button
              className="flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-white disabled:opacity-50"
              type="submit"
              disabled={updatePostMutation.isPending}
            >
              {updatePostMutation.isPending && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
              {updatePostMutation.isPending ? 'Saving...' : 'Save changes'}
            </button>
            <button
              className="rounded-md bg-slate-100 px-3 py-2 text-slate-700"
              type="button"
              onClick={() => setEditingPostId(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
