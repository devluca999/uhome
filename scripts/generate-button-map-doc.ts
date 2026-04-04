/**
 * Generates docs/BUTTON_MAP.md from tests/fixtures/button-map.ts
 * Run: npm run docs:button-map
 */
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { BUTTON_MAP_ENTRIES, type ButtonMapEntry } from '../tests/fixtures/button-map.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '..', 'docs', 'BUTTON_MAP.md')

function esc(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function expectStr(e: ButtonMapEntry['expect']): string {
  if (e.kind === 'url') return `URL matches \`${String(e.pattern)}\``
  if (e.kind === 'visible') return `Visible: ${e.text ? `\`${String(e.text)}\`` : e.selector || 'element'}`
  if (e.kind === 'dialog') return `Dialog: ${String(e.name)}`
  if (e.kind === 'loaded') return `Heading: ${String(e.heading)}`
  return 'N/A (external / manual)'
}

const roleOrder = ['landlord', 'tenant', 'admin', 'auth'] as const

const grouped = new Map<string, ButtonMapEntry[]>()
for (const entry of BUTTON_MAP_ENTRIES) {
  const key = `${entry.mapRole}::${entry.pageLabel}`
  if (!grouped.has(key)) grouped.set(key, [])
  grouped.get(key)!.push(entry)
}

let md = `# Button map

Interactive controls inventory for uhome (generated from [\`tests/fixtures/button-map.ts\`](../tests/fixtures/button-map.ts)). Regenerate: \`npm run docs:button-map\`.

## Subscription Plans (landlord)

**Note:** \`/landlord/subscription-plans\` is **not** registered in \`src/router/index.tsx\`. CTAs still call \`navigate('/landlord/subscription-plans')\` from Settings (billing), Properties (plan gate), and Finances — users may see a blank child route or unexpected UI until a route is added.

| Location | Element | Expected action | Expected result / next state | Edge cases | Verified |
|----------|---------|-----------------|------------------------------|------------|----------|
| Settings · Billing | Upgrade plan / upgrade banners | Opens subscription flow | Navigates to \`/landlord/subscription-plans\` | Broken route — see note above | ❌ |
| Properties · Plan gate | View plans | Opens plans | Same as above | Only when add-property blocked | ❌ |
| Finances | Upgrade / View plans CTAs | Opens plans | Same as above | Copy varies by UI state | ❌ |

`

for (const role of roleOrder) {
  md += `\n## ${role.charAt(0).toUpperCase() + role.slice(1)}\n\n`
  const keys = [...grouped.keys()].filter(k => k.startsWith(`${role}::`)).sort()
  for (const key of keys) {
    const parts = key.split('::')
    const pageLabel = parts.slice(1).join('::')
    md += `### ${pageLabel}\n\n`
    md +=
      '| Location | Element | Expected action | Expected result / next state | Edge cases | Verified |\n'
    md +=
      '|----------|---------|-----------------|------------------------------|------------|----------|\n'
    for (const e of grouped.get(key)!) {
      const loc = esc(`${e.pageLabel} · \`${e.route}\` · ${e.component}`)
      const el = esc(e.elementDescription)
      const act = esc(e.expectedAction)
      const res = esc(expectStr(e.expect))
      const edge = esc(e.edgeCases)
      md += `| ${loc} | ${el} | ${act} | ${res} | ${edge} | ${e.verified} |\n`
    }
    md += '\n'
  }
}

md += `
## E2E coverage

Playwright: [\`tests/e2e/critical-path/button-map.spec.ts\`](../tests/e2e/critical-path/button-map.spec.ts) (uses [\`setupMockSupabase\`](../tests/visual/helpers/mock-supabase.ts)).

Entries may set \`skipE2e\` where flows are conditional, external (OAuth, Stripe), or covered elsewhere.
`

writeFileSync(outPath, md, 'utf8')
console.log('Wrote', outPath)
