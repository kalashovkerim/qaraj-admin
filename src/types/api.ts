export type ApiEnvelope<T> = {
  status: boolean
  message: string
  data: T
}

export type ApiError = {
  status: boolean
  statusCode: number
  error: string
}

export type ValidationErrorItem = {
  path: string
  code: string
  message: string
}

export type ValidationErrorResponse = {
  status: boolean
  statusCode: number
  errors: ValidationErrorItem[]
}

export type Admin = {
  id: number
  email: string
  createdAt: string
  updatedAt: string
}

export type Category = {
  id: number
  name: string
  slug: string
  createdAt: string
  updatedAt: string
}

export type SectionImage = {
  id: number
  sectionId: number
  imageUrl: string
  altText: string | null
  orderIndex: number
  createdAt: string
  updatedAt: string
}

export type SectionType = 'TEXT' | 'IMAGE_COLLECTION'

export type Section = {
  id: number
  postId: number
  type: SectionType
  textContent: string | null
  orderIndex: number
  images: SectionImage[]
  createdAt: string
  updatedAt: string
}

export type PostSummary = {
  id: number
  title: string
  slug: string
  description: string
  preparationYear: number
  primaryImageUrl: string
  orderIndex: number
  isPublished: boolean
  categoryId: number
  category: Category
  createdAt: string
  updatedAt: string
}

export type PostDetail = PostSummary & {
  sections: Section[]
}
