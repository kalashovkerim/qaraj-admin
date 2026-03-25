import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { categoriesService } from '../services/categories'

export function CategoriesPage() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesService.list,
  })

  const createMutation = useMutation({
    mutationFn: categoriesService.create,
    onSuccess: () => {
      setName('')
      setSlug('')
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: categoriesService.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })

  if (categoriesQuery.isLoading) return <p>Loading categories...</p>
  if (categoriesQuery.isError) return <p className="text-rose-600">Failed to load categories.</p>

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-slate-900">Categories</h2>
      <form
        className="grid gap-2 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault()
          createMutation.mutate({ name, slug: slug || undefined })
        }}
      >
        <input
          className="rounded-md border border-slate-300 px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          required
        />
        <input
          className="rounded-md border border-slate-300 px-3 py-2"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="Slug (optional)"
        />
        <button className="rounded-md bg-slate-900 px-3 py-2 text-white" type="submit">
          Add category
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {categoriesQuery.data?.map((category) => (
          <div
            key={category.id}
            className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-b-0"
          >
            <div>
              <p className="font-medium">{category.name}</p>
              <p className="text-sm text-slate-500">{category.slug}</p>
            </div>
            <button
              className="rounded-md bg-rose-100 px-3 py-1.5 text-sm text-rose-700"
              onClick={() => removeMutation.mutate(category.id)}
              type="button"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
