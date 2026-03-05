/**
 * Email Templates for Newsletter Campaigns
 *
 * Provides template rendering for different newsletter styles
 */

export type TemplateStyle = 'Newsletter' | 'Announcement' | 'Update' | 'Educational'

export interface TemplateVariables {
  subject: string
  content: string
  unsubscribeUrl?: string
  companyName?: string
  companyLogo?: string
}

/**
 * Render newsletter content with template styling
 */
export function renderNewsletterTemplate(
  style: TemplateStyle,
  variables: TemplateVariables
): string {
  const { content, unsubscribeUrl = '#', companyName = 'Uhome', companyLogo = '' } = variables

  const baseStyles = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #e0e0e0; }
      .content { padding: 30px 20px; }
      .footer { text-align: center; padding: 20px 0; border-top: 2px solid #e0e0e0; font-size: 12px; color: #666; }
      .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
      .unsubscribe { font-size: 11px; color: #999; margin-top: 20px; }
      a { color: #007bff; }
    </style>
  `

  let template = ''

  switch (style) {
    case 'Newsletter':
      template = `
        <div class="container">
          <div class="header">
            ${companyLogo ? `<img src="${companyLogo}" alt="${companyName}" style="max-width: 200px; margin-bottom: 10px;">` : ''}
            <h1 style="margin: 0; color: #333;">${companyName} Newsletter</h1>
          </div>
          <div class="content">
            ${renderMarkdown(content)}
          </div>
          <div class="footer">
            <p>Thank you for subscribing to ${companyName} updates.</p>
            <p class="unsubscribe">
              <a href="${unsubscribeUrl}">Unsubscribe</a> | 
              <a href="https://uhome.app">Visit Website</a>
            </p>
          </div>
        </div>
      `
      break

    case 'Announcement':
      template = `
        <div class="container">
          <div class="header" style="background-color: #f8f9fa; border-radius: 8px 8px 0 0;">
            ${companyLogo ? `<img src="${companyLogo}" alt="${companyName}" style="max-width: 150px; margin-bottom: 10px;">` : ''}
            <h2 style="margin: 0; color: #333;">Important Announcement</h2>
          </div>
          <div class="content" style="background-color: #fff;">
            ${renderMarkdown(content)}
          </div>
          <div class="footer">
            <p class="unsubscribe">
              <a href="${unsubscribeUrl}">Unsubscribe</a>
            </p>
          </div>
        </div>
      `
      break

    case 'Update':
      template = `
        <div class="container">
          <div class="header">
            <h2 style="margin: 0; color: #007bff;">Product Update</h2>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">What's new at ${companyName}</p>
          </div>
          <div class="content">
            ${renderMarkdown(content)}
          </div>
          <div class="footer">
            <p>Stay updated with the latest from ${companyName}.</p>
            <p class="unsubscribe">
              <a href="${unsubscribeUrl}">Unsubscribe</a>
            </p>
          </div>
        </div>
      `
      break

    case 'Educational':
      template = `
        <div class="container">
          <div class="header" style="border-bottom: 3px solid #28a745;">
            <h2 style="margin: 0; color: #28a745;">${companyName} Tips & Guides</h2>
          </div>
          <div class="content">
            ${renderMarkdown(content)}
          </div>
          <div class="footer">
            <p>Learn more at <a href="https://uhome.app">uhome.app</a></p>
            <p class="unsubscribe">
              <a href="${unsubscribeUrl}">Unsubscribe</a>
            </p>
          </div>
        </div>
      `
      break

    default:
      template = `
        <div class="container">
          <div class="content">
            ${renderMarkdown(content)}
          </div>
          <div class="footer">
            <p class="unsubscribe">
              <a href="${unsubscribeUrl}">Unsubscribe</a>
            </p>
          </div>
        </div>
      `
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${baseStyles}
</head>
<body>
  ${template}
</body>
</html>`
}

/**
 * Simple markdown to HTML converter (basic support)
 */
function renderMarkdown(markdown: string): string {
  let html = markdown

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>')

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')

  // Italic
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>')

  // Paragraphs (split by double newline)
  html = html
    .split(/\n\n+/)
    .map(para => {
      para = para.trim()
      if (para && !para.startsWith('<')) {
        return `<p>${para}</p>`
      }
      return para
    })
    .join('\n')

  // Line breaks
  html = html.replace(/\n/g, '<br>')

  return html
}

/**
 * Generate plain text version from HTML
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<h[1-6]>(.*?)<\/h[1-6]>/gi, '$1\n\n')
    .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '$1')
    .replace(/<em>(.*?)<\/em>/gi, '$1')
    .replace(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
