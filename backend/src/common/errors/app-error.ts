// src/common/errors/app-error.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class AppError extends HttpException {
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR) {
    super(message, statusCode);
    this.isOperational = true;

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}