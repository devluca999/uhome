/**
 * Upload Monitoring Hook
 *
 * Wrapper around upload operations that logs to admin_upload_logs table.
 * Tracks file size, type, upload duration, success/failure status.
 */

import { supabase } from '@/lib/supabase/client'
import { anonymizeUserId, anonymizeStorageUrl } from '@/lib/admin/data-anonymizer'

export interface UploadLog {
  user_id: string // Anonymized
  user_role: 'tenant' | 'landlord' | 'admin'
  bucket: string
  file_name: string
  file_size_bytes: number
  file_type: string
  upload_duration_ms?: number
  status: 'success' | 'failed'
  error_message?: string
  storage_url?: string // Anonymized
}

/**
 * Log upload to admin_upload_logs table
 */
export async function logUpload(uploadLog: UploadLog) {
  try {
    // Call Edge Function to insert upload log (service role access)
    const { error } = await supabase.functions.invoke('log-upload', {
      body: { uploadLog },
    })

    if (error) {
      console.error('Failed to log upload:', error)
    }
  } catch (error) {
    console.error('Error logging upload:', error)
  }
}

/**
 * Track upload with monitoring
 */
export async function trackUpload<T>(
  uploadFn: () => Promise<T>,
  options: {
    bucket: string
    fileName: string
    fileSize: number
    fileType: string
  }
): Promise<{ result: T | null; error: Error | null }> {
  const startTime = Date.now()
  let error: Error | null = null
  let result: T | null = null

  try {
    // Get current user and role
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = (userData?.role || 'tenant') as 'tenant' | 'landlord' | 'admin'

    // Perform upload
    result = await uploadFn()
    const duration = Date.now() - startTime

    // Log successful upload
    await logUpload({
      user_id: anonymizeUserId(user.id),
      user_role: userRole,
      bucket: options.bucket,
      file_name: options.fileName,
      file_size_bytes: options.fileSize,
      file_type: options.fileType,
      upload_duration_ms: duration,
      status: 'success',
      storage_url: typeof result === 'string' ? anonymizeStorageUrl(result) : undefined,
    })

    return { result, error: null }
  } catch (err) {
    error = err instanceof Error ? err : new Error(String(err))
    const duration = Date.now() - startTime

    // Get current user for logging
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      const userRole = (userData?.role || 'tenant') as 'tenant' | 'landlord' | 'admin'

      // Log failed upload
      await logUpload({
        user_id: anonymizeUserId(user.id),
        user_role: userRole,
        bucket: options.bucket,
        file_name: options.fileName,
        file_size_bytes: options.fileSize,
        file_type: options.fileType,
        upload_duration_ms: duration,
        status: 'failed',
        error_message: error.message,
      })
    }

    return { result: null, error }
  }
}
