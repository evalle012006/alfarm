/**
 * Admin Fetch Utility
 * 
 * Wrapper around fetch() that automatically includes `credentials: 'include'`
 * for httpOnly cookie authentication on admin API routes.
 * 
 * Use this for ALL admin-side fetch calls to prevent auth failures.
 */
export async function adminFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: 'include',
  });
}
