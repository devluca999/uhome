/**
 * Export data to CSV format
 */

export interface CSVRow {
  [key: string]: string | number | null | undefined
}

/**
 * Convert an array of objects to CSV format
 */
export function convertToCSV(data: CSVRow[], headers?: string[]): string {
  if (data.length === 0) return ''

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0])

  // Create header row
  const headerRow = csvHeaders.map(header => escapeCSVValue(header)).join(',')

  // Create data rows
  const dataRows = data.map(row => {
    return csvHeaders
      .map(header => {
        const value = row[header]
        return escapeCSVValue(value)
      })
      .join(',')
  })

  return [headerRow, ...dataRows].join('\n')
}

/**
 * Escape CSV value (handle commas, quotes, newlines)
 */
function escapeCSVValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''

  const stringValue = String(value)

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string = 'export.csv'): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up
  URL.revokeObjectURL(url)
}

/**
 * Export ledger data to CSV
 */
export interface LedgerRow {
  date: string
  type: 'rent' | 'expense'
  description: string
  amount: number
  property?: string
  category?: string
  status?: string
}

export function exportLedgerToCSV(rows: LedgerRow[], filename: string = 'ledger-export.csv'): void {
  const csvData = rows.map(row => ({
    Date: row.date,
    Type: row.type === 'rent' ? 'Rent' : 'Expense',
    Description: row.description,
    Amount: row.amount,
    Property: row.property || '',
    Category: row.category || '',
    Status: row.status || '',
  }))

  const csvContent = convertToCSV(csvData)
  downloadCSV(csvContent, filename)
}
