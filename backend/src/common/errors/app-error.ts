import { HttpException } from '@nestjs/common';
import { ErrorCodes, type ErrorCode } from './error-codes.js';

export class AppError extends HttpException {
  public readonly code: ErrorCode;
  public readonly details: unknown;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    opts?: {
      message?: string;
      details?: unknown;
      cause?: unknown;
      status?: number;
      isOperational?: boolean;
    },
  ) {
    const definition = ErrorCodes[code];
    const status = opts?.status ?? definition.status;
    const message = opts?.message ?? definition.message;
    const details = opts?.details;

    super({ code, message, details }, status, { cause: opts?.cause });

    this.code = code;
    this.details = details;
    this.isOperational = opts?.isOperational ?? status < 500;
  }
}