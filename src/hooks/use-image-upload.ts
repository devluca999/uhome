import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { trackUpload } from '@/hooks/admin/use-upload-monitoring'

type BucketType = 'images' | 'avatars'

export function useImageUpload(bucket: BucketType = 'images') {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  async function uploadImage(file: File, scopeId: string): Promise<string | null> {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('File must be an image')
      return null
    }

    // Validate file size (avatars: 2MB, images: 10MB)
    const maxSize = bucket === 'avatars' ? 2 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      const sizeMB = bucket === 'avatars' ? '2MB' : '10MB'
      setError(`Image must be less than ${sizeMB}`)
      return null
    }

    setUploading(true)
    setProgress(0)
    setError(null)

    try {
      // Generate unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${scopeId}/${fileName}`

      // Track upload with monitoring
      const { result: publicUrl, error: uploadError } = await trackUpload(
        async () => {
          // Upload to Supabase Storage
          const { error: uploadErr } = await supabase.storage.from(bucket).upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

          if (uploadErr) {
            throw uploadErr
          }

          // Get public URL
          const {
            data: { publicUrl: url },
          } = supabase.storage.from(bucket).getPublicUrl(filePath)

          return url
        },
        {
          bucket,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        }
      )

      if (uploadError) {
        console.error('Upload error:', uploadError)
        setError(uploadError.message)
        return null
      }

      setProgress(100)
      return publicUrl || null
    } catch (err) {
      console.error('Image upload error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload image'
      setError(errorMessage)
      return null
    } finally {
      setUploading(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }

  async function deleteImage(url: string): Promise<boolean> {
    try {
      // Extract file path from URL
      const urlParts = url.split('/')
      const bucketIndex = urlParts.findIndex(part => part === bucket)
      if (bucketIndex === -1 || bucketIndex === urlParts.length - 1) {
        setError('Invalid image URL')
        return false
      }

      const filePath = urlParts.slice(bucketIndex + 1).join('/')

      // Delete from storage
      const { error: deleteError } = await supabase.storage.from(bucket).remove([filePath])

      if (deleteError) {
        console.error('Delete error:', deleteError)
        setError(deleteError.message)
        return false
      }

      return true
    } catch (err) {
      console.error('Image delete error:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete image')
      return false
    }
  }

  async function uploadMultipleImages(
    files: File[],
    scopeId: string
  ): Promise<{ urls: string[]; errors: string[] }> {
    const urls: string[] = []
    const errors: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setProgress(((i + 1) / files.length) * 100)

      const url = await uploadImage(file, scopeId)
      if (url) {
        urls.push(url)
      } else if (error) {
        errors.push(`${file.name}: ${error}`)
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
    error,
  }
}
