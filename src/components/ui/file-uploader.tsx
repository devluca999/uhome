import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Upload, X, File, Image } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export interface FileUploaderProps {
  bucket: 'documents' | 'images'
  accept: string
  maxSizeMB: number
  onUpload: (url: string, file: File) => void | Promise<void>
  onError?: (error: string) => void
  scopeType: 'property' | 'lease'
  scopeId: string
  multiple?: boolean
  className?: string
  disabled?: boolean
}

export function FileUploader({
  bucket,
  accept,
  maxSizeMB,
  onUpload,
  onError,
  scopeType,
  scopeId,
  multiple = false,
  className,
  disabled = false,
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [previewFiles, setPreviewFiles] = useState<Array<{ file: File; preview: string }>>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const isImage = (file: File) => file.type.startsWith('image/')

  const validateFile = (file: File): string | null => {
    // Check file size
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > maxSizeMB) {
      return `File size exceeds ${maxSizeMB}MB limit`
    }

    // Check file type
    const fileType = file.type
    const acceptedTypes = accept.split(',').map(t => t.trim())
    const matchesType = acceptedTypes.some(type => {
      if (type === 'image/*') return fileType.startsWith('image/')
      if (type === 'application/pdf') return fileType === 'application/pdf'
      if (type.startsWith('.')) {
        const ext = file.name.toLowerCase().split('.').pop()
        return type.slice(1) === ext
      }
      return fileType === type
    })

    if (!matchesType) {
      return `File type not supported. Accepted: ${accept}`
    }

    return null
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const filesToUpload = Array.from(files)

    // Validate all files
    for (const file of filesToUpload) {
      const error = validateFile(file)
      if (error) {
        onError?.(error)
        return
      }
    }

    // Create previews for images
    if (isImage(filesToUpload[0])) {
      const previews = filesToUpload.map(file => ({
        file,
        preview: URL.createObjectURL(file),
      }))
      setPreviewFiles(previews)
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // Upload files sequentially with progress updates
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i]
        // In a real implementation, you'd upload via supabase.storage
        // For now, simulate upload progress
        await new Promise(resolve => setTimeout(resolve, 500))
        setUploadProgress(((i + 1) / filesToUpload.length) * 100)

        // Generate a mock URL - in real implementation, this comes from Supabase
        const mockUrl = `https://storage.supabase.co/${bucket}/${scopeId}/${file.name}`
        await onUpload(mockUrl, file)
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      setPreviewFiles([])
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const removePreview = (index: number) => {
    setPreviewFiles(prev => {
      const newPreviews = [...prev]
      URL.revokeObjectURL(newPreviews[index].preview)
      newPreviews.splice(index, 1)
      return newPreviews
    })
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div
        className={cn(
          'border-2 border-dashed rounded-lg transition-colors',
          dragActive ? 'border-primary bg-primary/5' : 'border-border',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="p-8 text-center">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={e => handleFiles(e.target.files)}
            className="hidden"
            disabled={disabled || uploading}
          />

          {uploading ? (
            <div className="space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Uploading...</p>
                <div className="mt-2 w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">{Math.round(uploadProgress)}%</p>
              </div>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                {bucket === 'images' ? (
                  <Image className="w-6 h-6 text-muted-foreground" />
                ) : (
                  <File className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                Drop {multiple ? 'files' : 'file'} here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Max size: {maxSizeMB}MB • Accepted: {accept}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={disabled || uploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose {multiple ? 'Files' : 'File'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Image Previews */}
      <AnimatePresence>
        {previewFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {previewFiles.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative aspect-square rounded-lg overflow-hidden border border-border group"
              >
                <img
                  src={item.preview}
                  alt={item.file.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removePreview(index)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={uploading}
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm p-2">
                  <p className="text-xs truncate">{item.file.name}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
