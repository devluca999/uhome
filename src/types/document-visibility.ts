export type DocumentVisibility = 'private' | 'landlord' | 'household'

export const DOCUMENT_VISIBILITY_OPTIONS: { value: DocumentVisibility; label: string }[] = [
  { value: 'private', label: 'Private (only me)' },
  { value: 'landlord', label: 'Shared with landlord' },
  { value: 'household', label: 'Shared with household' },
]

export function parseDocumentVisibility(raw: string | null | undefined): DocumentVisibility {
  if (raw === 'private' || raw === 'landlord' || raw === 'household') return raw
  return 'household'
}
