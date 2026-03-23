/**
 * Shared error utilities for DentCare
 */

/** Cria um erro de acesso proibido (403) */
export function ForbiddenError(message: string): Error {
  const error = new Error(message);
  error.name = "ForbiddenError";
  (error as any).statusCode = 403;
  return error;
}

/** Cria um erro de não encontrado (404) */
export function NotFoundError(message: string): Error {
  const error = new Error(message);
  error.name = "NotFoundError";
  (error as any).statusCode = 404;
  return error;
}

/** Cria um erro de validação (400) */
export function ValidationError(message: string): Error {
  const error = new Error(message);
  error.name = "ValidationError";
  (error as any).statusCode = 400;
  return error;
}
