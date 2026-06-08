/** Application error carrying an HTTP status and a stable machine code. */
export class ApiError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} code  SCREAMING_SNAKE machine code
   * @param {string} message  user-safe message
   * @param {unknown} [details]  optional field-level details
   */
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (msg, details) => new ApiError(400, 'BAD_REQUEST', msg, details);
export const unauthorized = (msg = 'Unauthorized') => new ApiError(401, 'UNAUTHORIZED', msg);
export const forbidden = (msg = 'Forbidden') => new ApiError(403, 'FORBIDDEN', msg);
export const notFound = (msg = 'Not found') => new ApiError(404, 'NOT_FOUND', msg);
export const conflict = (msg, details) => new ApiError(409, 'CONFLICT', msg, details);

/** Wrap an async route handler so thrown errors reach the error middleware. */
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
