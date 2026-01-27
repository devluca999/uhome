import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Download, FileText, FileDown } from 'lucide-react'
import {
  createSpring,
  motion as motionTokens,
  durationToSeconds,
  useReducedMotion,
} from '@/lib/motion'
import { cn } from '@/lib/utils'
import { MarkdownEditor } from '@/components/ui/markdown-editor'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useNotes } from '@/hooks/use-notes'
import { useReceiptGeneration } from '@/hooks/use-receipt-generation'
import { supabase } from '@/lib/supabase/client'
import type { RentRecordWithRelations } from '@/hooks/use-landlord-rent-records'

interface RentLedgerRowProps {
  record: RentRecordWithRelations
  onReceiptGenerated?: () => void
  onLateFeeUpdated?: () => void
}

export function RentLedgerRow({
  record,
  onReceiptGenerated,
  onLateFeeUpdated,
}: RentLedgerRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [showNotesEditor, setShowNotesEditor] = useState(false)
  const [editingNoteContent, setEditingNoteContent] = useState('')
  const [showLateFeeInput, setShowLateFeeInput] = useState(false)
  const [lateFeeAmount, setLateFeeAmount] = useState(
    record.late_fee ? record.late_fee.toString() : '0'
  )
  const [updatingLateFee, setUpdatingLateFee] = useState(false)
  const { notes, createNote, updateNote } = useNotes('rent_record', record.id)
  const { generateReceipt, generating: generatingReceipt } = useReceiptGeneration()
  const cardSpring = createSpring('card')
  const prefersReducedMotion = useReducedMotion()

  const note = notes[0] // Single note per rent record

  // MVP: Manual late fee application (no automation)
  const totalDue = Number(record.amount) + (record.late_fee || 0)
  const hasLateFee = (record.late_fee || 0) > 0
  const isOverdue = record.status === 'overdue'

  const handleSaveNote = async () => {
    if (note) {
      await updateNote(note.id, editingNoteContent)
    } else {
      await createNote(editingNoteContent)
    }
    setShowNotesEditor(false)
    setEditingNoteContent('')
  }

  const handleUpdateLateFee = async () => {
    setUpdatingLateFee(true)
    try {
      const amount = parseFloat(lateFeeAmount) || 0
      const { error } = await supabase
        .from('rent_records')
        .update({ late_fee: amount })
        .eq('id', record.id)

      if (error) {
        alert(`Failed to update late fee: ${error.message}`)
      } else {
        setShowLateFeeInput(false)
        if (onLateFeeUpdated) {
          onLateFeeUpdated()
        }
      }
    } catch (error) {
      console.error('Failed to update late fee:', error)
      alert('Failed to update late fee')
    } finally {
      setUpdatingLateFee(false)
    }
  }

  const getStatusColor = () => {
    switch (record.status) {
      case 'paid':
        return 'text-green-600 dark:text-green-400'
      case 'overdue':
        return 'text-red-600 dark:text-red-400'
      case 'pending': {
        const dueDate = new Date(record.due_date)
        const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        return daysUntilDue <= 7 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
      }
      default:
        return 'text-muted-foreground'
    }
  }

  const getStatusBadge = () => {
    switch (record.status) {
      case 'paid':
        return 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30'
      case 'overdue':
        return 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30'
      case 'pending': {
        const dueDate = new Date(record.due_date)
        const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        return daysUntilDue <= 7
          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
          : 'bg-muted text-muted-foreground border-border'
      }
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  return (
    <motion.div
      className="border-b border-border last:border-b-0"
      initial={false}
      whileHover={
        prefersReducedMotion
          ? {}
          : {
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
            }
      }
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : {
              duration: durationToSeconds(motionTokens.duration.fast),
            }
      }
      layout={false}
    >
      <motion.button
        className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer will-change-transform"
        onClick={() => setExpanded(!expanded)}
        whileHover={prefersReducedMotion ? {} : { y: -1 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : {
                type: 'spring',
                ...cardSpring,
              }
        }
        layout={false}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-foreground">
                {record.property?.name || 'Unknown Property'}
              </span>
              <span className={cn('text-xs px-2 py-0.5 rounded border', getStatusBadge())}>
                {record.status}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {record.tenant?.user?.email || 'Unknown Tenant'}
            </div>
          </div>
          <div className="text-right">
            <div className={cn('font-semibold', getStatusColor())}>
              ${totalDue.toLocaleString()}
            </div>
            {hasLateFee && (
              <div className="text-xs text-red-600 dark:text-red-400">
                ${Number(record.amount).toLocaleString()} + $
                {(record.late_fee || 0).toLocaleString()} late fee
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Due: {new Date(record.due_date).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="ml-4">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </motion.button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ maxHeight: 0, opacity: 0 }}
            animate={{ maxHeight: 600, opacity: 1 }}
            exit={{ maxHeight: 0, opacity: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : {
                    duration: durationToSeconds(motionTokens.duration.base),
                    ease: motionTokens.ease.standard,
                  }
            }
            style={{ overflow: 'hidden' }}
            layout={false}
          >
            <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
              {/* Late Fee Section - MVP: Manual application only */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Late Fee:</span>
                  {!showLateFeeInput && isOverdue && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLateFeeAmount(record.late_fee ? record.late_fee.toString() : '0')
                        setShowLateFeeInput(true)
                      }}
                      className="h-6 text-xs"
                    >
                      {hasLateFee ? 'Edit' : 'Apply'} Late Fee
                    </Button>
                  )}
                </div>
                {showLateFeeInput ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={lateFeeAmount}
                        onChange={e => setLateFeeAmount(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 h-8 text-sm"
                        disabled={updatingLateFee}
                      />
                      <Button
                        size="sm"
                        onClick={handleUpdateLateFee}
                        className="h-8 text-xs"
                        disabled={updatingLateFee}
                      >
                        {updatingLateFee ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowLateFeeInput(false)
                          setLateFeeAmount(record.late_fee ? record.late_fee.toString() : '0')
                        }}
                        className="h-8 text-xs"
                        disabled={updatingLateFee}
                      >
                        Cancel
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total due: $
                      {(Number(record.amount) + (parseFloat(lateFeeAmount) || 0)).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-foreground">
                    {hasLateFee ? (
                      <span className="text-red-600 dark:text-red-400">
                        ${(record.late_fee || 0).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">No late fee</span>
                    )}
                  </p>
                )}
              </div>

              {record.paid_date && (
                <div>
                  <span className="text-xs text-muted-foreground">Paid Date:</span>
                  <p className="text-sm text-foreground">
                    {new Date(record.paid_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              {(record.payment_method_type || record.payment_method) && (
                <div>
                  <span className="text-xs text-muted-foreground">Payment Method:</span>
                  <p className="text-sm text-foreground">
                    {record.payment_method_type === 'external' && record.payment_method_label
                      ? record.payment_method_label
                      : record.payment_method_type === 'manual'
                        ? 'Manual'
                        : record.payment_method
                          ? record.payment_method.charAt(0).toUpperCase() +
                            record.payment_method.slice(1)
                          : 'Manual'}
                  </p>
                </div>
              )}
              {record.notes && (
                <div>
                  <span className="text-xs text-muted-foreground">Notes:</span>
                  <p className="text-sm text-foreground">{record.notes}</p>
                </div>
              )}
              {record.status === 'paid' && (
                <div>
                  <span className="text-xs text-muted-foreground">Receipt:</span>
                  <div className="mt-1 flex gap-2">
                    {record.receipt_url ? (
                      <>
                        <a
                          href={record.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                          View Receipt
                        </a>
                        <a
                          href={record.receipt_url}
                          download
                          className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </a>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const result = await generateReceipt(record.id)
                          if (result.error) {
                            alert(`Failed to generate receipt: ${result.error.message}`)
                          } else if (result.receipt_url) {
                            // Receipt generated successfully, refresh data
                            if (onReceiptGenerated) {
                              onReceiptGenerated()
                            } else {
                              window.location.reload()
                            }
                          }
                        }}
                        disabled={generatingReceipt}
                      >
                        <FileDown className="w-4 h-4 mr-1" />
                        {generatingReceipt ? 'Generating...' : 'Generate Receipt'}
                      </Button>
                    )}
                  </div>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Notes:</span>
                  {!showNotesEditor && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingNoteContent(note?.content || '')
                        setShowNotesEditor(true)
                      }}
                      className="h-6 text-xs"
                    >
                      {note ? 'Edit' : 'Add Note'}
                    </Button>
                  )}
                </div>
                {showNotesEditor ? (
                  <div className="space-y-2">
                    <MarkdownEditor
                      value={editingNoteContent}
                      onChange={setEditingNoteContent}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveNote}
                        className="h-7 text-xs"
                        disabled={!editingNoteContent.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowNotesEditor(false)
                          setEditingNoteContent('')
                        }}
                        className="h-7 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : note ? (
                  <div className="text-sm">
                    <MarkdownRenderer content={note.content} />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No notes</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
