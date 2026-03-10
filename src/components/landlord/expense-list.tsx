import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MarkdownEditor } from '@/components/ui/markdown-editor'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { ExpenseForm } from './expense-form'
import { useNotes } from '@/hooks/use-notes'
import { motion as motionTokens, createSpring, useReducedMotion } from '@/lib/motion'
import type { Database } from '@/types/database'

type Expense = Database['public']['Tables']['expenses']['Row']
type ExpenseUpdate = Database['public']['Tables']['expenses']['Update']

interface ExpenseListProps {
  expenses: Expense[]
  onUpdate: (
    id: string,
    data: ExpenseUpdate
  ) => Promise<{ data: Expense | null; error: Error | null }>
  onDelete: (id: string) => Promise<{ error: Error | null }>
  properties: Array<{ id: string; name: string }>
}

export function ExpenseList({ expenses, onUpdate, onDelete, properties }: ExpenseListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [notesExpandedId, setNotesExpandedId] = useState<string | null>(null)
  const cardSpring = createSpring('card')
  const prefersReducedMotion = useReducedMotion()

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return

    setDeletingId(id)
    await onDelete(id)
    setDeletingId(null)
  }

  const handleUpdate = async (id: string, data: ExpenseUpdate) => {
    const result = await onUpdate(id, data)
    if (!result.error) {
      setEditingId(null)
    }
    return result
  }

  const getPropertyName = (propertyId: string) => {
    return properties.find(p => p.id === propertyId)?.name || 'Unknown Property'
  }

  if (expenses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">No expenses recorded yet.</p>
    )
  }

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {expenses.map(expense => (
          <motion.div
            key={expense.id}
            initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
            animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
            exit={{ opacity: motionTokens.opacity.hidden, y: -8 }}
            whileHover={prefersReducedMotion ? {} : { y: -2 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : {
                    type: 'spring',
                    ...cardSpring,
                  }
            }
            layout={false}
            className="will-change-transform-opacity"
          >
            {editingId === expense.id ? (
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <ExpenseForm
                    initialData={expense}
                    onSubmit={data => handleUpdate(expense.id, data)}
                    onCancel={() => setEditingId(null)}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-foreground">{expense.name}</h3>
                        {expense.category && (
                          <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            {expense.category}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getPropertyName(expense.property_id)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(expense.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-lg font-semibold text-foreground">
                        ${Number(expense.amount).toLocaleString()}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(expense.id)}
                        disabled={deletingId === expense.id}
                        aria-label="Edit expense"
                        title="Edit expense"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(expense.id)}
                        disabled={deletingId === expense.id}
                        className="text-destructive hover:text-destructive/90"
                        aria-label="Delete expense"
                        title="Delete expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <ExpenseNotes
                    expenseId={expense.id}
                    isExpanded={notesExpandedId === expense.id}
                    onToggle={() =>
                      setNotesExpandedId(notesExpandedId === expense.id ? null : expense.id)
                    }
                  />
                </CardContent>
              </Card>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function ExpenseNotes({
  expenseId,
  isExpanded,
  onToggle,
}: {
  expenseId: string
  isExpanded: boolean
  onToggle: () => void
}) {
  const { notes, createNote, updateNote } = useNotes('expense', expenseId)
  const [showEditor, setShowEditor] = useState(false)
  const [editingContent, setEditingContent] = useState('')
  const note = notes[0]

  const handleSave = async () => {
    if (note) {
      await updateNote(note.id, editingContent)
    } else {
      await createNote(editingContent)
    }
    setShowEditor(false)
    setEditingContent('')
  }

  const handleEdit = () => {
    setEditingContent(note?.content || '')
    setShowEditor(true)
  }

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">Notes:</span>
        <Button variant="ghost" size="sm" onClick={onToggle} className="h-6 text-xs">
          {isExpanded ? 'Hide' : 'Show'} Notes
        </Button>
      </div>
      {isExpanded && (
        <div className="space-y-2">
          {showEditor ? (
            <div className="space-y-2">
              <MarkdownEditor value={editingContent} onChange={setEditingContent} rows={3} />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="h-7 text-xs"
                  disabled={!editingContent.trim()}
                >
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowEditor(false)
                    setEditingContent('')
                  }}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              {note ? (
                <div className="text-sm">
                  <MarkdownRenderer content={note.content} />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No notes</p>
              )}
              <Button variant="outline" size="sm" onClick={handleEdit} className="h-7 text-xs">
                {note ? 'Edit Note' : 'Add Note'}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
