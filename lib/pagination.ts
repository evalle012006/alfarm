/**
 * Standardized pagination helper for API routes.
 * Accepts both limit/offset and page/per_page formats.
 * Always returns a consistent pagination response object.
 */

interface PaginationInput {
  limit?: string | null;
  offset?: string | null;
  page?: string | null;
  per_page?: string | null;
}

interface PaginationParams {
  limit: number;
  offset: number;
}

interface PaginationResponse {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasMore: boolean;
}

const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;

/**
 * Parse pagination params from query string.
 * Supports both `limit`+`offset` and `page`+`per_page`.
 */
export function parsePagination(params: PaginationInput): PaginationParams {
  // Prefer page/per_page if provided
  if (params.page) {
    const page = Math.max(1, parseInt(params.page) || 1);
    const perPage = Math.min(MAX_PER_PAGE, Math.max(1, parseInt(params.per_page || '') || DEFAULT_PER_PAGE));
    return {
      limit: perPage,
      offset: (page - 1) * perPage,
    };
  }

  // Fallback to limit/offset
  const limit = Math.min(MAX_PER_PAGE, Math.max(1, parseInt(params.limit || '') || DEFAULT_PER_PAGE));
  const offset = Math.max(0, parseInt(params.offset || '') || 0);
  return { limit, offset };
}

/**
 * Build a standardized pagination response object.
 */
export function buildPaginationResponse(total: number, limit: number, offset: number): PaginationResponse {
  const perPage = limit;
  const page = Math.floor(offset / perPage) + 1;
  const totalPages = Math.ceil(total / perPage);
  return {
    total,
    page,
    perPage,
    totalPages,
    hasMore: page < totalPages,
  };
}
