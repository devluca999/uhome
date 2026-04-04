/** Longest-prefix match so nested routes (e.g. /landlord/properties/uuid) get the section title. */
export function mobilePageTitleForPath(
  pathname: string,
  routes: { path: string; label: string }[]
): string | null {
  const sorted = [...routes].sort((a, b) => b.path.length - a.path.length)
  for (const r of sorted) {
    if (pathname === r.path || pathname.startsWith(`${r.path}/`)) {
      return r.label
    }
  }
  return null
}
