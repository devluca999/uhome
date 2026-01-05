// Supabase Edge Function for PDF Receipt Generation
// Generates a canonical PDF receipt for rent payments

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async req => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { rent_record_id } = await req.json()

    if (!rent_record_id) {
      return new Response(JSON.stringify({ error: 'rent_record_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch rent record with relations
    const { data: rentRecord, error: recordError } = await supabaseClient
      .from('rent_records')
      .select(
        `
        *,
        property:properties(id, name, address, owner_id),
        tenant:tenants(
          id,
          user:users(email, id)
        )
      `
      )
      .eq('id', rent_record_id)
      .single()

    if (recordError || !rentRecord) {
      return new Response(JSON.stringify({ error: 'Rent record not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify user has access to this rent record (landlord or tenant)
    const property = Array.isArray(rentRecord.property)
      ? rentRecord.property[0]
      : rentRecord.property
    const tenant = Array.isArray(rentRecord.tenant) ? rentRecord.tenant[0] : rentRecord.tenant

    if (!property) {
      return new Response(JSON.stringify({ error: 'Property not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const isLandlord = property.owner_id === user.id
    const isTenant = tenant?.user?.id === user.id

    if (!isLandlord && !isTenant) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch receipt settings (for landlord customization)
    const { data: settings } = await supabaseClient
      .from('receipt_settings')
      .select('*')
      .eq('user_id', property.owner_id)
      .single()

    // Use defaults if no settings found
    const receiptSettings = settings || {
      header_text: null,
      logo_url: null,
      footer_note: null,
      currency: 'USD',
      date_format: 'MM/DD/YYYY',
    }

    // Format currency
    const currencySymbol = receiptSettings.currency === 'USD' ? '$' : receiptSettings.currency
    const formatCurrency = (amount: number) => {
      return `${currencySymbol}${amount.toFixed(2)}`
    }

    // Format date based on date_format setting
    const formatDate = (dateString: string) => {
      const date = new Date(dateString)
      const format = receiptSettings.date_format || 'MM/DD/YYYY'

      if (format === 'MM/DD/YYYY') {
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const year = date.getFullYear()
        return `${month}/${day}/${year}`
      } else if (format === 'DD/MM/YYYY') {
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const year = date.getFullYear()
        return `${day}/${month}/${year}`
      } else if (format === 'YYYY-MM-DD') {
        return date.toISOString().split('T')[0]
      }
      // Default fallback
      return date.toLocaleDateString()
    }

    // Create PDF document
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([612, 792]) // Letter size (8.5 x 11 inches)
    const { width, height } = page.getSize()

    // Embed fonts
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const helveticaObliqueFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

    let yPosition = height - 72 // Start from top with 1 inch margin

    // Header section
    const headerText = receiptSettings.header_text || property.name
    page.drawText(headerText, {
      x: 72,
      y: yPosition,
      size: 24,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    })
    yPosition -= 40

    // Property address (if available)
    if (property.address) {
      page.drawText(property.address, {
        x: 72,
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: rgb(0.4, 0.4, 0.4),
      })
      yPosition -= 20
    }

    yPosition -= 20 // Spacing

    // Receipt title
    page.drawText('RENT RECEIPT', {
      x: 72,
      y: yPosition,
      size: 18,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    })
    yPosition -= 40

    // Receipt details
    const lineHeight = 20
    const labelWidth = 150

    // Receipt Number
    page.drawText('Receipt Number:', {
      x: 72,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4),
    })
    page.drawText(rentRecord.id.substring(0, 8).toUpperCase(), {
      x: 72 + labelWidth,
      y: yPosition,
      size: 10,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    })
    yPosition -= lineHeight

    // Issue Date
    const issueDate = rentRecord.paid_date || rentRecord.due_date
    page.drawText('Issue Date:', {
      x: 72,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4),
    })
    page.drawText(formatDate(issueDate), {
      x: 72 + labelWidth,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    })
    yPosition -= lineHeight

    // Tenant
    if (tenant?.user?.email) {
      page.drawText('Tenant:', {
        x: 72,
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: rgb(0.4, 0.4, 0.4),
      })
      page.drawText(tenant.user.email, {
        x: 72 + labelWidth,
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      })
      yPosition -= lineHeight
    }

    // Property
    page.drawText('Property:', {
      x: 72,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4),
    })
    page.drawText(property.name, {
      x: 72 + labelWidth,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    })
    yPosition -= lineHeight

    // Due Date
    page.drawText('Due Date:', {
      x: 72,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4),
    })
    page.drawText(formatDate(rentRecord.due_date), {
      x: 72 + labelWidth,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    })
    yPosition -= lineHeight

    // Paid Date (if paid)
    if (rentRecord.paid_date) {
      page.drawText('Paid Date:', {
        x: 72,
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: rgb(0.4, 0.4, 0.4),
      })
      page.drawText(formatDate(rentRecord.paid_date), {
        x: 72 + labelWidth,
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      })
      yPosition -= lineHeight
    }

    // Payment Method
    const paymentMethodText =
      rentRecord.payment_method_type === 'external' && rentRecord.payment_method_label
        ? rentRecord.payment_method_label
        : rentRecord.payment_method_type === 'manual'
          ? 'Manual'
          : 'Manual'

    page.drawText('Payment Method:', {
      x: 72,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4),
    })
    page.drawText(paymentMethodText, {
      x: 72 + labelWidth,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    })
    yPosition -= 30

    // Amount section (prominent)
    const amountText = formatCurrency(Number(rentRecord.amount))
    const amountWidth = helveticaBoldFont.widthOfTextAtSize(amountText, 32)
    page.drawText('Amount Paid:', {
      x: 72,
      y: yPosition,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    })
    yPosition -= 35
    page.drawText(amountText, {
      x: 72,
      y: yPosition,
      size: 32,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    })
    yPosition -= 50

    // Notes (if any)
    if (rentRecord.notes) {
      page.drawText('Notes:', {
        x: 72,
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: rgb(0.4, 0.4, 0.4),
      })
      yPosition -= 15

      // Wrap notes text (simple wrapping)
      const notes = rentRecord.notes
      const maxWidth = width - 144 // 72 margin on each side
      const words = notes.split(' ')
      let line = ''
      for (const word of words) {
        const testLine = line + (line ? ' ' : '') + word
        const testWidth = helveticaFont.widthOfTextAtSize(testLine, 10)
        if (testWidth > maxWidth && line) {
          page.drawText(line, {
            x: 72,
            y: yPosition,
            size: 10,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          })
          yPosition -= 15
          line = word
        } else {
          line = testLine
        }
      }
      if (line) {
        page.drawText(line, {
          x: 72,
          y: yPosition,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        })
        yPosition -= 20
      }
      yPosition -= 10
    }

    // Footer note (if set)
    if (receiptSettings.footer_note) {
      yPosition = Math.max(yPosition, 100) // Ensure footer is near bottom
      page.drawText(receiptSettings.footer_note, {
        x: 72,
        y: yPosition,
        size: 8,
        font: helveticaObliqueFont,
        color: rgb(0.5, 0.5, 0.5),
      })
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save()

    // Upload to Supabase Storage
    const fileName = `${property.id}/${rent_record_id}-receipt.pdf`
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('receipts')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return new Response(
        JSON.stringify({ error: 'Failed to upload receipt: ' + uploadError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabaseClient.storage.from('receipts').getPublicUrl(fileName)

    // Update rent record with receipt URL
    const { error: updateError } = await supabaseClient
      .from('rent_records')
      .update({ receipt_url: publicUrl })
      .eq('id', rent_record_id)

    if (updateError) {
      console.error('Update rent record error:', updateError)
      // Don't fail - receipt was generated, just URL update failed
    }

    // Return the receipt URL
    return new Response(JSON.stringify({ receipt_url: publicUrl }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Receipt generation error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
