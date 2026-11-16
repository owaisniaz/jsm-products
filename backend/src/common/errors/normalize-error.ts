import { HttpException, HttpStatus } from '@nestjs/common';
import { AppError } from './app-error.js';
import { ErrorCodes, type ErrorCode } from './error-codes.js';

type Dict = Record<string, any>;
const isObj = (e: unknown): e is Dict => typeof e === 'object' && e !== null;
const named = (e: unknown, ...names: string[]) => isObj(e) && names.includes(e.name);

interface Translator {
  match: (e: unknown) => boolean;
  handle: (e: any) => AppError;
}

const JWT_CODES: Record<string, ErrorCode> = {
  TokenExpiredError: 'TOKEN_EXPIRED',
  NotBeforeError: 'TOKEN_NOT_ACTIVE',
  JsonWebTokenError: 'TOKEN_INVALID',
};

// Order matters: specific first, generic last
const translators: Translator[] = [
  { // JWT
    match: (e) => named(e, ...Object.keys(JWT_CODES)),
    handle: (e) =>
      new AppError(JWT_CODES[e.name], {
        details: e.expiredAt ? { expiredAt: e.expiredAt } : undefined,
        cause: e,
      }),
  },
  { // Zod
    match: (e) => named(e, 'ZodError'),
    handle: (e) =>
      new AppError('VALIDATION_ERROR', {
        details: (e.issues ?? []).map((i: Dict) => ({
          field: (i.path ?? []).join('.'),
          message: i.message,
        })),
        cause: e,
      }),
  },
  { // Mongo duplicate key
    match: (e) => isObj(e) && e.code === 11000,
    handle: (e) => {
      const field = Object.keys(e.keyValue ?? {})[0];
      return new AppError('DUPLICATE_FIELD', {
        message: field ? `${field} already exists` : undefined,
        details: { field },
        cause: e,
      });
    },
  },
  { // Mongoose CastError
    match: (e) => named(e, 'CastError'),
    handle: (e) =>
      new AppError('INVALID_ID', { message: `Invalid ${e.path}`, details: { field: e.path }, cause: e }),
  },
  { // Mongoose ValidationError
    match: (e) => named(e, 'ValidationError'),
    handle: (e) =>
      new AppError('VALIDATION_ERROR', {
        details: Object.values(e.errors ?? {}).map((x: any) => ({ field: x.path, message: x.message })),
        cause: e,
      }),
  },
  { // body-parser (malformed JSON, payload too large)
    match: (e) => isObj(e) && typeof e.type === 'string' && e.type.startsWith('entity.'),
    handle: (e) =>
      e.type === 'entity.too.large'
        ? new AppError('PAYLOAD_TOO_LARGE', { cause: e })
        : new AppError('BAD_REQUEST', { message: 'Malformed request body', cause: e }),
  },
  { // Nest HttpException (ValidationPipe, NotFound, Forbidden, unknown route...)
    match: (e) => e instanceof HttpException,
    handle: (e: HttpException) => {
      const status = e.getStatus();
      const body = e.getResponse();
      const obj: Dict = isObj(body) ? body : {};
      const raw = typeof body === 'string' ? body : obj.message;

      const candidate = String(obj.code ?? HttpStatus[status]);
      const code: ErrorCode =
        candidate in ErrorCodes ? (candidate as ErrorCode) : status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST';

      return new AppError(code, {
        status,
        message: Array.isArray(raw) ? undefined : raw,
        details: Array.isArray(raw) ? raw : obj.details,
        isOperational: status < 500,
        cause: e,
      });
    },
  },
];

export function normalizeError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  for (const t of translators) {
    try {
      if (t.match(err)) return t.handle(err);
    } catch {
      // a broken translator must never break error handling
    }
  }

  return new AppError('INTERNAL_ERROR', {
    message: err instanceof Error ? err.message : 'Unknown error',
    isOperational: false,
    cause: err,
  });
}