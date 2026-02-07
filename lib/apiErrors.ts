/**
 * Standardized API error handling
 * All API errors follow consistent structure and never leak sensitive information
 */

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  error: ApiError;
}

/**
 * Standard error codes
 */
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INSUFFICIENT_INVENTORY: 'INSUFFICIENT_INVENTORY',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  FORBIDDEN: 'FORBIDDEN',
} as const;

/**
 * Create standardized error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: unknown
): Response {
  const errorResponse: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Predefined error responses
 */
export const ErrorResponses = {
  validationError: (message: string, details?: unknown) =>
    createErrorResponse(ErrorCodes.VALIDATION_ERROR, message, 400, details),

  authenticationRequired: (message = 'Authentication required') =>
    createErrorResponse(ErrorCodes.AUTHENTICATION_REQUIRED, message, 401),

  unauthorized: (message = 'You do not have permission to perform this action') =>
    createErrorResponse(ErrorCodes.UNAUTHORIZED, message, 403),

  notFound: (message = 'Resource not found') =>
    createErrorResponse(ErrorCodes.NOT_FOUND, message, 404),

  conflict: (message: string) =>
    createErrorResponse(ErrorCodes.CONFLICT, message, 409),

  insufficientInventory: (message = 'Insufficient inventory available') =>
    createErrorResponse(ErrorCodes.INSUFFICIENT_INVENTORY, message, 409),

  rateLimitExceeded: (message = 'Too many requests. Please try again later.') =>
    createErrorResponse(ErrorCodes.RATE_LIMIT_EXCEEDED, message, 429),

  internalError: (message = 'An internal error occurred. Please try again later.') =>
    createErrorResponse(ErrorCodes.INTERNAL_ERROR, message, 500),

  forbidden: (message = 'Forbidden') =>
    createErrorResponse(ErrorCodes.FORBIDDEN, message, 403),
};

/**
 * Safe error handler that never leaks stack traces or sensitive info
 * Use this in catch blocks to handle unexpected errors
 */
export function handleUnexpectedError(error: unknown): Response {
  // Log error for debugging (in production, this should go to logging service)
  console.error('Unexpected error:', error);

  // Never expose error details to client in production
  if (process.env.NODE_ENV === 'production') {
    return ErrorResponses.internalError();
  }

  // In development, provide more context
  const message = error instanceof Error ? error.message : 'Unknown error occurred';
  return ErrorResponses.internalError(message);
}

/**
 * Validate and parse JSON request body safely
 */
export async function parseRequestBody<T>(request: Request): Promise<T> {
  try {
    const body = await request.json();
    return body as T;
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}
