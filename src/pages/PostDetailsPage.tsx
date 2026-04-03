import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, rectSortingStrategy, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { postsService } from '../services/posts'
import { sectionsService } from '../services/sections'
import { teamMembersService } from '../services/teamMembers'
import { uploadService } from '../services/upload'
import type { PostDetail, Section, SectionImage, SectionType, TeamMember } from '../types/api'
import { toAbsoluteImageUrl } from '../utils/url'
import { useNavigate } from 'react-router-dom'

function typeLabel(type: SectionType) {
  if (type === 'TEXT') return 'TEXT'
  return 'IMAGE COLLECTION'
}

function normalizeLineBreaks(value: string) {
  return value.replace(/\r\n/g, '\n')
}

function SortableSectionWrapper({
  section,
  index,
  onDelete,
  isSectionSaving,
  children,
}: {
  section: Section
  index: number
  onDelete: (sectionId: number) => void
  isSectionSaving: boolean
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className={`relative ${isDragging ? 'opacity-60' : 'opacity-100'}`}>
      <div className="flex items-start justify-between gap-4 pb-6">
        <div className="flex items-start gap-4">
          <button
            type="button"
            className="mt-1 cursor-grab select-none text-slate-500 hover:text-slate-900"
            aria-label="Reorder section"
            {...attributes}
            {...listeners}
          >
            ≡
          </button>
          <div className="pt-0.5">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{typeLabel(section.type)}</div>
            <div className="text-xs text-slate-400">Section {index + 1}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isSectionSaving ? (
            <span className="text-xs text-slate-500">Saving...</span>
          ) : (
            <span className="text-xs text-slate-400">Auto-save on blur</span>
          )}
          <button
            type="button"
            className="text-xs font-medium text-rose-600 hover:text-rose-700"
            onClick={() => onDelete(section.id)}
          >
            Delete
          </button>
        </div>
      </div>

      {children}
    </div>
  )
}

function AutoResizeTextarea({
  value,
  onChange,
  onBlur,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  disabled?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null)

  const resize = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }
  useEffect(() => {
    requestAnimationFrame(resize)
  }, [value, disabled])

  return (
    <textarea
      ref={ref}
      value={value}
      disabled={disabled}
      onChange={(e) => {
        onChange(e.target.value)
        requestAnimationFrame(resize)
      }}
      onBlur={onBlur}
      onFocus={() => requestAnimationFrame(resize)}
      className="w-full resize-none bg-transparent px-0 py-0 text-[28px] leading-[1.25] tracking-[-0.02em] text-slate-900 placeholder:text-slate-300 focus:outline-none"
      placeholder="Start writing..."
    />
  )
}

function TextSectionBlock({
  section,
  onSaveText,
  isSaving,
}: {
  section: Section
  onSaveText: (sectionId: number, text: string) => void
  isSaving: boolean
}) {
  const [draft, setDraft] = useState(section.textContent ?? '')
  const original = section.textContent ?? ''
  const isDirty = draft !== original

  return (
    <AutoResizeTextarea
      value={draft}
      disabled={isSaving}
      onChange={(v) => setDraft(v)}
      onBlur={() => {
        if (!isDirty) return
        onSaveText(section.id, draft)
      }}
    />
  )
}

function getYoutubeEmbedUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return `https://www.youtube.com/embed/${match[1]}`
  }
  return null
}

function MediaTile({
  image,
  onDelete,
}: {
  image: SectionImage
  onDelete: (imageId: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  const isYoutube = !!image.youtubeUrl
  const isVideo = !!image.videoUrl
  const isImage = !!image.imageUrl

  const renderMedia = () => {
    if (isYoutube && image.youtubeUrl) {
      const embedUrl = getYoutubeEmbedUrl(image.youtubeUrl)
      if (embedUrl) {
        return (
          <iframe
            src={embedUrl}
            title={image.altText ?? 'YouTube video'}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )
      }
      return <div className="flex h-full items-center justify-center text-sm text-slate-500">Invalid YouTube URL</div>
    }

    if (isVideo && image.videoUrl) {
      return (
        <video
          src={toAbsoluteImageUrl(image.videoUrl)}
          className="h-full w-full object-cover"
          controls
          preload="metadata"
        />
      )
    }

    if (isImage && image.imageUrl) {
      return (
        <img
          src={toAbsoluteImageUrl(image.imageUrl)}
          alt={image.altText ?? ''}
          className="h-full w-full object-cover"
          loading="lazy"
          draggable={false}
        />
      )
    }

    return <div className="flex h-full items-center justify-center text-sm text-slate-500">No media</div>
  }

  const mediaTypeLabel = isYoutube ? 'YouTube' : isVideo ? 'Video' : 'Image'

  return (
    <div ref={setNodeRef} style={style} className={`relative h-full ${isDragging ? 'opacity-60' : 'opacity-100'}`}>
      <div className="relative h-full overflow-hidden rounded-lg bg-slate-50">
        {renderMedia()}
        <div className="absolute left-2 top-2 flex items-center gap-2">
          <button
            type="button"
            className="pointer-events-auto rounded bg-white/80 px-2 py-1 text-xs text-slate-900 shadow-sm"
            aria-label="Drag media"
            {...attributes}
            {...listeners}
          >
            ↕
          </button>
          <span className="rounded bg-white/80 px-2 py-1 text-xs text-slate-600 shadow-sm">
            {mediaTypeLabel}
          </span>
        </div>

        <button
          type="button"
          className="absolute right-2 top-2 rounded bg-white/80 px-2 py-1 text-xs text-rose-700 shadow-sm hover:bg-white"
          onClick={() => onDelete(image.id)}
        >
          Delete
        </button>
      </div>
    </div>
  )
}

function ImageCollectionSectionBlock({
  section,
  onUploadImages,
  onUploadVideos,
  onAddYoutube,
  onDeleteImage,
  onReorderImages,
  isUploading,
  isReordering,
  isAddingYoutube,
}: {
  section: Section
  onUploadImages: (sectionId: number, files: File[]) => void
  onUploadVideos: (sectionId: number, files: File[]) => void
  onAddYoutube: (sectionId: number, youtubeUrl: string) => void
  onDeleteImage: (sectionId: number, imageId: number) => void
  onReorderImages: (sectionId: number, items: Array<{ id: number; orderIndex: number }>) => void
  isUploading: boolean
  isReordering: boolean
  isAddingYoutube: boolean
}) {
  const images = useMemo(
    () => [...(section.images ?? [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [section.images],
  )

  const [isDropActive, setIsDropActive] = useState(false)
  const [showYoutubeInput, setShowYoutubeInput] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = images.findIndex((img) => img.id === active.id)
    const newIndex = images.findIndex((img) => img.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const moved = arrayMove(images, oldIndex, newIndex)
    onReorderImages(section.id, moved.map((img, index) => ({ id: img.id, orderIndex: index })))
  }

  const handleYoutubeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = youtubeUrl.trim()
    if (!trimmed) return
    onAddYoutube(section.id, trimmed)
    setYoutubeUrl('')
    setShowYoutubeInput(false)
  }

  const isBusy = isUploading || isReordering || isAddingYoutube

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
          Media
          {isUploading ? <span className="ml-3 text-slate-400">Uploading...</span> : null}
          {isReordering ? <span className="ml-3 text-slate-400">Reordering...</span> : null}
          {isAddingYoutube ? <span className="ml-3 text-slate-400">Adding...</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:opacity-90">
            Image
            <input
              type="file"
              accept="image/*"
              disabled={isBusy}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                onUploadImages(section.id, [file])
                e.currentTarget.value = ''
              }}
            />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:opacity-90">
            Video
            <input
              type="file"
              accept="video/*"
              disabled={isBusy}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                onUploadVideos(section.id, [file])
                e.currentTarget.value = ''
              }}
            />
          </label>
          <button
            type="button"
            disabled={isBusy}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:opacity-90 disabled:opacity-50"
            onClick={() => setShowYoutubeInput(!showYoutubeInput)}
          >
            YouTube
          </button>
        </div>
      </div>

      {showYoutubeInput && (
        <form onSubmit={handleYoutubeSubmit} className="flex items-center gap-3">
          <input
            type="url"
            placeholder="Paste YouTube URL..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            disabled={isAddingYoutube}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isAddingYoutube || !youtubeUrl.trim()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:opacity-90 disabled:opacity-50"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setShowYoutubeInput(false)
              setYoutubeUrl('')
            }}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
        </form>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDropActive(true)
        }}
        onDragLeave={() => setIsDropActive(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDropActive(false)
          const allFiles = Array.from(e.dataTransfer.files ?? [])
          const imageFiles = allFiles.filter((f) => f.type.startsWith('image/'))
          const videoFiles = allFiles.filter((f) => f.type.startsWith('video/'))
          if (imageFiles.length) onUploadImages(section.id, imageFiles)
          if (videoFiles.length) onUploadVideos(section.id, videoFiles)
        }}
        className={`rounded-lg ${isDropActive ? 'bg-slate-50' : 'bg-transparent'} transition-colors`}
      >
        {images.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">Drop images or videos here, or use the buttons above.</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={images.map((img) => img.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {images.map((img) => (
                  <div key={img.id} className="aspect-[4/3]">
                    <MediaTile
                      image={img}
                      onDelete={(imageId) => onDeleteImage(section.id, imageId)}
                    />
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}

function AddSectionControl({
  onAddText,
  onAddImageCollection,
  disabled,
}: {
  onAddText: (textContent: string) => void
  onAddImageCollection: () => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<SectionType | null>(null)
  const [textContent, setTextContent] = useState('')

  return (
    <div className="py-10">
      {!open ? (
        <button
          type="button"
          disabled={disabled}
          className="text-left text-sm font-medium text-slate-900 hover:text-slate-700"
          onClick={() => setOpen(true)}
        >
          + Add Section
        </button>
      ) : (
        <div className="space-y-3">
          {mode === null && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={disabled}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:opacity-90 disabled:opacity-50"
                onClick={() => setMode('TEXT')}
              >
                TEXT
              </button>
              <button
                type="button"
                disabled={disabled}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:opacity-90 disabled:opacity-50"
                onClick={() => {
                  onAddImageCollection()
                  setMode(null)
                  setOpen(false)
                }}
              >
                IMAGE COLLECTION
              </button>
              <button
                type="button"
                className="text-xs text-slate-500 hover:text-slate-700"
                onClick={() => setOpen(false)}
                disabled={disabled}
              >
                Cancel
              </button>
            </div>
          )}

          {mode === 'TEXT' && (
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault()
                const trimmed = textContent.trim()
                if (!trimmed) return
                onAddText(normalizeLineBreaks(trimmed))
                setTextContent('')
                setMode(null)
                setOpen(false)
              }}
            >
              <textarea
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Write text for this section..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={4}
              />
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={disabled || textContent.trim().length === 0}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:opacity-90 disabled:opacity-50"
                >
                  Add text section
                </button>
                <button
                  type="button"
                  className="text-xs text-slate-500 hover:text-slate-700"
                  onClick={() => {
                    setMode(null)
                    setTextContent('')
                  }}
                  disabled={disabled}
                >
                  Back
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

function PostTeamMembersPanel({ postId, members }: { postId: number; members: TeamMember[] }) {
  const queryClient = useQueryClient()
  const [fullname, setFullname] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editFullname, setEditFullname] = useState('')
  const [editRoleTitle, setEditRoleTitle] = useState('')

  const createMutation = useMutation({
    mutationFn: () =>
      teamMembersService.createForPost(postId, {
        fullname: fullname.trim(),
        title: roleTitle.trim(),
      }),
    onSuccess: () => {
      setFullname('')
      setRoleTitle('')
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (args: { id: number; fullname: string; title: string }) =>
      teamMembersService.update(args.id, { fullname: args.fullname, title: args.title }),
    onSuccess: () => {
      setEditingId(null)
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => teamMembersService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['post', postId] }),
  })

  const isBusy =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  return (
    <div className="mb-12 rounded-lg border border-slate-200 bg-slate-50/50 p-6">
      <h3 className="text-xs uppercase tracking-[0.18em] text-slate-500">Team members</h3>
      <p className="mt-1 text-sm text-slate-500">Credits for this project (name and role).</p>

      <form
        className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault()
          if (!fullname.trim() || !roleTitle.trim()) return
          createMutation.mutate()
        }}
      >
        <input
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          placeholder="Full name"
          value={fullname}
          onChange={(e) => setFullname(e.target.value)}
          disabled={isBusy}
        />
        <input
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          placeholder="Title / role"
          value={roleTitle}
          onChange={(e) => setRoleTitle(e.target.value)}
          disabled={isBusy}
        />
        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={isBusy || !fullname.trim() || !roleTitle.trim()}
        >
          {createMutation.isPending && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}
          Add member
        </button>
      </form>
      {(createMutation.isError || updateMutation.isError || deleteMutation.isError) && (
        <p className="mt-2 text-sm text-rose-600">Something went wrong. Try again.</p>
      )}

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {members.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">No team members yet.</p>
        ) : (
          members.map((m) => (
            <div
              key={m.id}
              className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
            >
              {editingId === m.id ? (
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={editFullname}
                    onChange={(e) => setEditFullname(e.target.value)}
                    disabled={updateMutation.isPending}
                  />
                  <input
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={editRoleTitle}
                    onChange={(e) => setEditRoleTitle(e.target.value)}
                    disabled={updateMutation.isPending}
                  />
                </div>
              ) : (
                <div>
                  <p className="font-medium text-slate-900">{m.fullname}</p>
                  <p className="text-sm text-slate-500">{m.title}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {editingId === m.id ? (
                  <>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                      disabled={updateMutation.isPending || !editFullname.trim() || !editRoleTitle.trim()}
                      onClick={() =>
                        updateMutation.mutate({
                          id: m.id,
                          fullname: editFullname.trim(),
                          title: editRoleTitle.trim(),
                        })
                      }
                    >
                      {updateMutation.isPending && (
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      )}
                      Save
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-slate-100 px-3 py-1.5 text-sm text-slate-700"
                      disabled={updateMutation.isPending}
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="rounded-md bg-slate-100 px-3 py-1.5 text-sm text-slate-700"
                      disabled={isBusy}
                      onClick={() => {
                        setEditingId(m.id)
                        setEditFullname(m.fullname)
                        setEditRoleTitle(m.title)
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="flex items-center justify-center gap-2 rounded-md bg-rose-100 px-3 py-1.5 text-sm text-rose-700 disabled:opacity-50"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(m.id)}
                    >
                      {deleteMutation.isPending && deleteMutation.variables === m.id ? (
                        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-400 border-t-rose-700" aria-hidden />
                      ) : null}
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function PostDetailsPage() {
  const { id } = useParams()
  const postId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [savedPulse, setSavedPulse] = useState(false)
  const savedPulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const postQuery = useQuery({
    queryKey: ['post', postId],
    queryFn: () => postsService.getById(postId),
    enabled: Number.isFinite(postId),
  })

  const sections = useMemo(() => {
    return [...(postQuery.data?.sections ?? [])].sort((a, b) => a.orderIndex - b.orderIndex)
  }, [postQuery.data?.sections])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const updateTextMutation = useMutation({
    mutationFn: ({ sectionId, text }: { sectionId: number; text: string }) => {
      return sectionsService.update(sectionId, { textContent: normalizeLineBreaks(text) })
    },
    onMutate: async ({ sectionId }) => {
      // Keep current UI text as-is; the editor already shows the draft.
      return { sectionId }
    },
    onSuccess: (updatedSection) => {
      queryClient.setQueryData<PostDetail>(['post', postId], (prev) => {
        if (!prev) return prev
        return {
          ...prev,
          sections: prev.sections.map((s) => (s.id === updatedSection.id ? updatedSection : s)),
        }
      })
      setSavedPulse(true)
      if (savedPulseTimeoutRef.current) clearTimeout(savedPulseTimeoutRef.current)
      savedPulseTimeoutRef.current = setTimeout(() => setSavedPulse(false), 1800)
    },
  })

  const createSectionMutation = useMutation({
    mutationFn: (args: {
      insertAt: number
      payload: { type: 'TEXT'; textContent: string } | { type: 'IMAGE_COLLECTION' }
    }) => {
      if (args.payload.type === 'TEXT') {
        return sectionsService.createForPost(postId, {
          type: 'TEXT',
          textContent: args.payload.textContent,
        })
      }
      return sectionsService.createForPost(postId, { type: 'IMAGE_COLLECTION' })
    },
    onSuccess: async (createdSection, variables) => {
      const sortedSections = [...sections].sort((a, b) => a.orderIndex - b.orderIndex)
      const insertIndex = Math.max(0, Math.min(variables.insertAt, sortedSections.length))

      const reordered = [
        ...sortedSections.slice(0, insertIndex).map((item) => item.id),
        createdSection.id,
        ...sortedSections.slice(insertIndex).map((item) => item.id),
      ]

      await sectionsService.reorder(
        postId,
        reordered.map((id, orderIndex) => ({ id, orderIndex })),
      )
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
    },
  })

  const removeSectionMutation = useMutation({
    mutationFn: (sectionId: number) => sectionsService.remove(sectionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['post', postId] }),
  })

  const addImagesMutation = useMutation({
    mutationFn: async ({ sectionId, files }: { sectionId: number; files: File[] }) => {
      const urls = await Promise.all(files.map((f) => uploadService.uploadImage(f)))
      return sectionsService.addAssets(sectionId, urls.map((url) => ({ imageUrl: url })))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['post', postId] }),
  })

  const addVideosMutation = useMutation({
    mutationFn: async ({ sectionId, files }: { sectionId: number; files: File[] }) => {
      const urls = await Promise.all(files.map((f) => uploadService.uploadImage(f)))
      return sectionsService.addAssets(sectionId, urls.map((url) => ({ videoUrl: url })))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['post', postId] }),
  })

  const addYoutubeMutation = useMutation({
    mutationFn: async ({ sectionId, youtubeUrl }: { sectionId: number; youtubeUrl: string }) => {
      return sectionsService.addAssets(sectionId, [{ youtubeUrl }])
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['post', postId] }),
  })

  const deleteImageMutation = useMutation({
    mutationFn: ({ sectionId, imageId }: { sectionId: number; imageId: number }) =>
      sectionsService.removeAsset(sectionId, imageId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['post', postId] }),
  })

  const [reorderMeta, setReorderMeta] = useState<{ sectionId?: number } | null>(null)

  const reorderSectionsMutation = useMutation({
    mutationFn: (items: Array<{ id: number; orderIndex: number }>) => sectionsService.reorder(postId, items),
    onMutate: async (items) => {
      await queryClient.cancelQueries({ queryKey: ['post', postId] })
      const prev = queryClient.getQueryData<PostDetail>(['post', postId])
      if (!prev) return { prev }
      setReorderMeta({ sectionId: undefined })

      const orderMap = new Map(items.map((it) => [it.id, it.orderIndex]))
      const nextSections = prev.sections
        .map((s) => ({ ...s, orderIndex: orderMap.get(s.id) ?? s.orderIndex }))
        .sort((a, b) => a.orderIndex - b.orderIndex)

      queryClient.setQueryData<PostDetail>(['post', postId], { ...prev, sections: nextSections })
      return { prev }
    },
    onError: (_err, _items, ctx) => {
      if (!ctx?.prev) return
      queryClient.setQueryData(['post', postId], ctx.prev)
    },
    onSettled: () => {
      setReorderMeta(null)
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
    },
  })

  const reorderImagesMutation = useMutation({
    mutationFn: ({ sectionId, items }: { sectionId: number; items: Array<{ id: number; orderIndex: number }> }) =>
      sectionsService.reorderAssets(sectionId, items),
    onMutate: async ({ sectionId, items }) => {
      await queryClient.cancelQueries({ queryKey: ['post', postId] })
      const prev = queryClient.getQueryData<PostDetail>(['post', postId])
      if (!prev) return { prev }
      setReorderMeta({ sectionId })

      const orderMap = new Map(items.map((it) => [it.id, it.orderIndex]))
      const nextSections = prev.sections.map((s) => {
        if (s.id !== sectionId) return s
        const nextImages = s.images
          .map((img) => ({ ...img, orderIndex: orderMap.get(img.id) ?? img.orderIndex }))
          .sort((a, b) => a.orderIndex - b.orderIndex)
        return { ...s, images: nextImages }
      })

      queryClient.setQueryData<PostDetail>(['post', postId], { ...prev, sections: nextSections })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx?.prev) return
      queryClient.setQueryData(['post', postId], ctx.prev)
    },
    onSettled: () => {
      setReorderMeta(null)
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
    },
  })

  const isTextSaving = (sectionId: number) => updateTextMutation.isPending && updateTextMutation.variables?.sectionId === sectionId

  const isSectionsBusy =
    createSectionMutation.isPending ||
    removeSectionMutation.isPending ||
    addImagesMutation.isPending ||
    addVideosMutation.isPending ||
    addYoutubeMutation.isPending ||
    deleteImageMutation.isPending

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = sections.findIndex((s) => s.id === active.id)
    const newIndex = sections.findIndex((s) => s.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const moved = arrayMove(sections, oldIndex, newIndex)
    reorderSectionsMutation.mutate(moved.map((s, index) => ({ id: s.id, orderIndex: index })))
  }

  if (postQuery.isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-slate-900" />
          <span className="text-sm text-slate-500">Loading post...</span>
        </div>
      </div>
    )
  }
  if (postQuery.isError || !postQuery.data) return <p className="text-rose-600">Post not found.</p>

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-8 md:px-[80px]">
        <div className="grid gap-10 md:grid-cols-[240px_1fr]">
          <aside className="hidden md:block">
            <div className="flex flex-col gap-3">
              <button
                type="button"
                className="text-left text-sm font-medium text-slate-900 hover:text-slate-700"
                onClick={() => navigate('/admin/posts')}
              >
                ← Back to posts
              </button>
              <div className="pt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                Editor status
              </div>
              <div className="text-sm text-slate-600">{savedPulse ? 'Saved' : 'Auto-save on blur'}</div>
              {reorderMeta?.sectionId ? (
                <div className="text-xs text-slate-400">Saving reorder...</div>
              ) : null}
            </div>
          </aside>

          <section className="bg-white">
            <div className="px-4 py-8 md:px-10">
              <div className="mb-8">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">POST</div>
                <h2 className="mt-2 text-[42px] font-extrabold leading-[1.02] tracking-[-0.03em] text-slate-900">
                  {postQuery.data.title}
                </h2>
                {postQuery.data.description ? (
                  <p className="mt-3 max-w-[720px] text-base leading-relaxed text-slate-600">
                    {postQuery.data.description}
                  </p>
                ) : null}
              </div>

              <PostTeamMembersPanel postId={postId} members={postQuery.data.teamMembers ?? []} />

              <div className="relative space-y-0">
                {isSectionsBusy && (
                  <div className="absolute inset-0 z-20 flex items-start justify-center bg-white/60 pt-24">
                    <div className="flex items-center gap-3 rounded-lg bg-white px-5 py-3 shadow-md">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
                      <span className="text-sm text-slate-600">Processing...</span>
                    </div>
                  </div>
                )}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
                  <AddSectionControl
                    disabled={createSectionMutation.isPending}
                    onAddText={(textContent) =>
                      createSectionMutation.mutate({
                        insertAt: 0,
                        payload: { type: 'TEXT', textContent },
                      })
                    }
                    onAddImageCollection={() =>
                      createSectionMutation.mutate({
                        insertAt: 0,
                        payload: { type: 'IMAGE_COLLECTION' },
                      })
                    }
                  />

                  <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                    {sections.map((section, index) => (
                      <div key={`section-wrap-${section.id}`}>
                        <SortableSectionWrapper
                          section={section}
                          index={index}
                          onDelete={(sectionId) => removeSectionMutation.mutate(sectionId)}
                          isSectionSaving={isTextSaving(section.id)}
                        >
                          <div className="pb-6">
                            {section.type === 'TEXT' ? (
                              <TextSectionBlock
                                key={`${section.id}-${section.textContent ?? ''}`}
                                section={section}
                                onSaveText={(sectionId, text) => updateTextMutation.mutate({ sectionId, text })}
                                isSaving={isTextSaving(section.id)}
                              />
                            ) : (
                              <ImageCollectionSectionBlock
                                section={section}
                                onUploadImages={(sectionId, files) => addImagesMutation.mutate({ sectionId, files })}
                                onUploadVideos={(sectionId, files) => addVideosMutation.mutate({ sectionId, files })}
                                onAddYoutube={(sectionId, youtubeUrl) => addYoutubeMutation.mutate({ sectionId, youtubeUrl })}
                                onDeleteImage={(sectionId, imageId) => deleteImageMutation.mutate({ sectionId, imageId })}
                                onReorderImages={(sectionId, items) => reorderImagesMutation.mutate({ sectionId, items })}
                                isUploading={addImagesMutation.isPending || addVideosMutation.isPending}
                                isReordering={reorderMeta?.sectionId === section.id && reorderImagesMutation.isPending}
                                isAddingYoutube={addYoutubeMutation.isPending}
                              />
                            )}
                          </div>
                        </SortableSectionWrapper>

                        {index < sections.length - 1 ? (
                          <AddSectionControl
                            disabled={createSectionMutation.isPending}
                            onAddText={(textContent) =>
                              createSectionMutation.mutate({
                                insertAt: index + 1,
                                payload: { type: 'TEXT', textContent },
                              })
                            }
                            onAddImageCollection={() =>
                              createSectionMutation.mutate({
                                insertAt: index + 1,
                                payload: { type: 'IMAGE_COLLECTION' },
                              })
                            }
                          />
                        ) : null}
                      </div>
                    ))}
                  </SortableContext>

                  <AddSectionControl
                    disabled={createSectionMutation.isPending}
                    onAddText={(textContent) =>
                      createSectionMutation.mutate({
                        insertAt: sections.length,
                        payload: { type: 'TEXT', textContent },
                      })
                    }
                    onAddImageCollection={() =>
                      createSectionMutation.mutate({
                        insertAt: sections.length,
                        payload: { type: 'IMAGE_COLLECTION' },
                      })
                    }
                  />
                </DndContext>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
