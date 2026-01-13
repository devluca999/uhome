import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export function useImageUpload(scopeType: 'property' | 'lease', scopeId: string) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  async function uploadImage(file: File): Promise<{ url: string; error: null } | { url: null; error: string }> {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { url: null, error: 'File must be an image' }
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes
    if (file.size > maxSize) {
      return { url: null, error: 'Image must be less than 5MB' }
    }

    setUploading(true)
    setProgress(0)

    try {
      // Generate unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${scopeId}/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return { url: null, error: uploadError.message }
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      setProgress(100)
      return { url: publicUrl, error: null }
    } catch (err) {
      console.error('Image upload error:', err)
      return { 
        url: null, 
        error: err instanceof Error ? err.message : 'Failed to upload image' 
      }
    } finally {
      setUploading(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }

  async function deleteImage(url: string): Promise<{ error: null } | { error: string }> {
    try {
      // Extract file path from URL
      const urlParts = url.split('/')
      const bucketIndex = urlParts.findIndex(part => part === 'images')
      if (bucketIndex === -1 || bucketIndex === urlParts.length - 1) {
        return { error: 'Invalid image URL' }
      }

      const filePath = urlParts.slice(bucketIndex + 1).join('/')

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('images')
        .remove([filePath])

      if (deleteError) {
        console.error('Delete error:', deleteError)
        return { error: deleteError.message }
      }

      return { error: null }
    } catch (err) {
      console.error('Image delete error:', err)
      return {
        error: err instanceof Error ? err.message : 'Failed to delete image'
      }
    }
  }

  async function uploadMultipleImages(
    files: File[]
  ): Promise<{ urls: string[]; errors: string[] }> {
    const urls: string[] = []
    const errors: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setProgress(((i + 1) / files.length) * 100)

      const result = await uploadImage(file)
      if (result.url) {
        urls.push(result.url)
      } else if (result.error) {
        errors.push(`${file.name}: ${result.error}`)
      }
    }

    return { urls, errors }
  }

  return {
    uploadImage,
    deleteImage,
    uploadMultipleImages,
    uploading,
    progress,
  }
}

