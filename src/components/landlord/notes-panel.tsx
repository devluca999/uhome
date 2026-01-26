import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MarkdownEditor } from '@/components/ui/markdown-editor'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { useNotes, type NoteEntityType } from '@/hooks/use-notes'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { motion as motionTokens, durationToSeconds, createSpring } from '@/lib/motion'

interface NotesPanelProps {
  entityType: NoteEntityType
  entityId: string
  className?: string
}

export function NotesPanel({ entityType, entityId, className }: NotesPanelProps) {
  const { notes, loading, createNote, updateNote, deleteNote } = useNotes(entityType, entityId)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newNoteContent, setNewNoteContent] = useState('')
  const [showNewNote, setShowNewNote] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingContent, setEditingContent] = useState<Record<string, string>>({})

  const cardSpring = createSpring('card')

  async function handleCreateNote() {
    if (!newNoteContent.trim()) return

    setSaving(true)
    const result = await createNote(newNoteContent)
    setSaving(false)

    if (!result.error) {
      // Note is already added to state by useNotes hook
      // Clear form and hide editor
      setNewNoteContent('')
      setShowNewNote(false)
      // Note persists automatically via useNotes hook state management
    }
  }

  async function handleUpdateNote(id: string, content: string) {
    setSaving(true)
    const result = await updateNote(id, content)
    setSaving(false)

    if (!result.error) {
      setEditingId(null)
      setEditingContent(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }
  }

  const handleStartEdit = (id: string, content: string) => {
    setEditingId(id)
    setEditingContent(prev => ({ ...prev, [id]: content }))
  }

  async function handleDeleteNote(id: string) {
    if (!confirm('Are you sure you want to delete this note?')) return
    await deleteNote(id)
  }

  return (
    <Card className={`glass-card ${className || ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Notes</CardTitle>
            <CardDescription>Free-form notes (markdown supported)</CardDescription>
          </div>
          {!showNewNote && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewNote(true)}
              disabled={loading}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Note
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showNewNote && (
          <motion.div
            initial={{ opacity: 0, maxHeight: 0 }}
            animate={{ opacity: 1, maxHeight: 500 }}
            exit={{ opacity: 0, maxHeight: 0 }}
            transition={{
              duration: durationToSeconds(motionTokens.duration.base),
              ease: motionTokens.ease.standard,
            }}
            style={{ overflow: 'hidden' }}
            className="space-y-3 p-4 border border-border rounded-md bg-muted/30"
          >
            <MarkdownEditor
              value={newNoteContent}
              onChange={setNewNoteContent}
              placeholder="Enter your note..."
              disabled={saving}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreateNote}
                disabled={saving || !newNoteContent.trim()}
              >
                {saving ? 'Saving...' : 'Save Note'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowNewNote(false)
                  setNewNoteContent('')
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading notes...</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No notes yet. Add one to get started.
          </p>
        ) : (
          <AnimatePresence initial={false}>
            {notes.map(note => (
              <motion.div
                key={note.id}
                layout={false}
                initial={{ opacity: motionTokens.opacity.hidden, y: 10 }}
                animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
                exit={{ opacity: motionTokens.opacity.hidden, y: -10 }}
                transition={{
                  type: 'spring',
                  ...cardSpring,
                }}
                className="p-4 border border-border rounded-md bg-muted/30"
              >
                {editingId === note.id ? (
                  <div className="space-y-3">
                    <MarkdownEditor
                      value={editingContent[note.id] || note.content}
                      onChange={content =>
                        setEditingContent(prev => ({ ...prev, [note.id]: content }))
                      }
                      disabled={saving}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          handleUpdateNote(note.id, editingContent[note.id] || note.content)
                        }
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingId(null)
                          setEditingContent(prev => {
                            const next = { ...prev }
                            delete next[note.id]
                            return next
                          })
                        }}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <MarkdownRenderer content={note.content} />
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(note.created_at).toLocaleDateString()}
                          {note.updated_at !== note.created_at && ' (edited)'}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEdit(note.id, note.content)}
                          className="h-7 w-7 p-0"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNote(note.id)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  )
}
