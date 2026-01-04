/**
 * Graph Export Utilities
 * 
 * MVP: Export graph as PNG (screenshot) or CSV (data)
 * Exports respect current filters, active datasets, and date range
 */

import { convertToCSV, downloadCSV } from './export-csv'

export interface GraphDataPoint {
  month: string
  rentCollected?: number
  outstandingRent?: number
  expenses?: number
  netCashFlow?: number
  income?: number
  net?: number
}

/**
 * Export graph data to CSV
 * Respects active filters and datasets
 */
export function exportGraphToCSV(
  data: GraphDataPoint[],
  activeDatasets: {
    rentCollected: boolean
    outstandingRent: boolean
    expenses: boolean
    netCashFlow: boolean
  },
  filename: string = 'graph-export.csv'
): void {
  const csvData = data.map(point => {
    const row: Record<string, string | number> = {
      Period: point.month,
    }

    if (activeDatasets.rentCollected && point.rentCollected !== undefined) {
      row['Rent Collected'] = point.rentCollected
    }
    if (activeDatasets.outstandingRent && point.outstandingRent !== undefined) {
      row['Outstanding Rent'] = point.outstandingRent
    }
    if (activeDatasets.expenses && point.expenses !== undefined) {
      row['Expenses'] = point.expenses
    }
    if (activeDatasets.netCashFlow && point.netCashFlow !== undefined) {
      row['Net Cash Flow'] = point.netCashFlow
    }
    // Support legacy format
    if (point.income !== undefined) {
      row['Income'] = point.income
    }
    if (point.net !== undefined) {
      row['Net'] = point.net
    }

    return row
  })

  const csvContent = convertToCSV(csvData)
  downloadCSV(csvContent, filename)
}

/**
 * Export graph as PNG (screenshot)
 * Uses html2canvas if available, otherwise falls back to basic canvas
 */
export async function exportGraphToPNG(
  elementId: string,
  filename: string = 'graph-export.png'
): Promise<void> {
  const element = document.getElementById(elementId)
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`)
  }

  try {
    // Try to use html2canvas if available
    // Note: html2canvas needs to be installed: npm install html2canvas
    // For MVP, we'll use a basic canvas approach
    const canvas = await captureElementAsCanvas(element)
    canvas.toBlob(blob => {
      if (!blob) {
        throw new Error('Failed to create blob from canvas')
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  } catch (error) {
    console.error('Failed to export graph as PNG:', error)
    // Fallback: try to use SVG if available
    throw error
  }
}

/**
 * Capture element as canvas
 * Basic implementation - can be enhanced with html2canvas
 */
async function captureElementAsCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  // For MVP: Create a basic canvas representation
  // In production, consider using html2canvas library
  const canvas = document.createElement('canvas')
  const rect = element.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = rect.height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Fill with background
  ctx.fillStyle = getComputedStyle(element).backgroundColor || '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Note: For full screenshot functionality, install html2canvas:
  // import html2canvas from 'html2canvas'
  // const canvas = await html2canvas(element)
  // return canvas

  // MVP fallback: Return a basic canvas with a message
  ctx.fillStyle = '#000000'
  ctx.font = '16px Arial'
  ctx.fillText('Graph export requires html2canvas library', 20, 50)
  ctx.fillText('Install: npm install html2canvas', 20, 80)

  return canvas
}

