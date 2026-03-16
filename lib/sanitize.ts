/**
 * Sanitize search input for API routes.
 * Trims whitespace and limits length to prevent abuse.
 */
export function sanitizeSearch(input: string | null | undefined, maxLength = 200): string {
  if (!input) return '';
  return input.trim().slice(0, maxLength);
}
