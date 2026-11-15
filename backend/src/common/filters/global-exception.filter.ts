// src/common/filters/global-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppError } from '../errors/app-error.js';

@Catch() // Catch ALL exceptions
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    console.error(
      `[GlobalExceptionFilter] ${request.method} ${request.originalUrl}`,
      exception,
    );

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let status = 'error';
    let isOperational = false;
    let stack: string | undefined;
    let errorDetails: unknown = null;
    const origin = this.getErrorOrigin(exception);

    // ============================================
    // 1. Normalize the error (same logic as Express)
    // ============================================
    const normalized = this.normalizeError(exception);

    if (normalized instanceof AppError) {
      statusCode = normalized.getStatus();
      message = normalized.message;
      status = statusCode >= 500 ? 'error' : 'fail';
      isOperational = normalized.isOperational;
      stack = normalized.stack;
    }
    else if (normalized instanceof HttpException) {
      statusCode = normalized.getStatus();
      const res = normalized.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (this.isRecord(res)) {
        const issues = res.errors ?? res.issues;
        const issueMessage = this.formatValidationMessages(issues);
        const responseMessage =
          typeof res.message === 'string'
            ? res.message
            : this.formatValidationMessages(res.message);

        message = issueMessage ?? responseMessage ?? message;
        errorDetails = issues ?? (Array.isArray(res.message) ? res.message : null);
      }
      status = statusCode >= 500 ? 'error' : 'fail';
      isOperational = true;
    }
    else if (normalized instanceof Error) {
      message = normalized.message;
      stack = normalized.stack;
    }

    // ============================================
    // 2. Send Response (Dev vs Prod)
    // ============================================
    if (process.env.NODE_ENV === 'development') {
      // Same as your sendDevError
      response.status(statusCode).json({
        status,
        error: {
          source: origin.source,
          type: origin.type,
          message,
          ...(errorDetails ? { details: errorDetails } : {}),
        },
        message,
        stack,
        path: request.url,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Same as your sendProdError
      if (isOperational) {
        response.status(statusCode).json({
          status,
          error: {
            source: origin.source,
            type: origin.type,
          },
          message,
        });
      } else {
        // Programming / unknown errors → hide details
        response.status(500).json({
          status: 'error',
          error: {
            source: origin.source,
            type: origin.type,
          },
          message: 'Internal Server Error',
        });
      }
    }
  }

  // ============================================
  // 3. Error Normalizer (exactly like Express)
  // ============================================
  private normalizeError(err: any): any {
    // MongoDB Duplicate Key
    if (err?.code === 11000) {
      const [field, value] = Object.entries(err.keyValue || {})[0] || [];
      return new AppError(`Duplicate field '${field}' with value: '${value}'`, 400);
    }

    // MongoDB CastError
    if (err?.name === 'CastError') {
      return new AppError(`Invalid ${err.path}: ${err.value}`, 400);
    }

    // MongoDB ValidationError
    if (err?.name === 'ValidationError') {
      const messages = Object.values(err.errors || {})
        .map((e: any) => e.message)
        .join('. ');
      return new AppError(messages || err.message || 'Invalid input data', 400);
    }

    // JWT Errors
    if (err?.name === 'JsonWebTokenError') {
      return new AppError('Invalid token. Please log in again!', 401);
    }

    if (err?.name === 'TokenExpiredError') {
      return new AppError('Your token has expired! Please login again', 401);
    }

    // Zod Validation Errors (fixed)
    if (err?.name === 'ZodError') {
      const messages =
        err.issues
          ?.map((issue: any) => {
            const path =
              Array.isArray(issue.path) && issue.path.length > 0
                ? issue.path.join('.')
                : null;

            return path ? `${path}: ${issue.message}` : issue.message;
          })
          .join('. ') || 'Validation failed';
          console.log("MESSAGE...",messages)

      return new AppError(messages, 400);
    }

    // NestJS built-in HttpException
    if (err instanceof HttpException) {
      return err;
    }

    return err;
  }

  private formatValidationMessages(value: unknown): string | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }

    const messages = value.flatMap((issue: unknown) => {
      if (typeof issue === 'string') {
        return [issue];
      }
      if (!this.isRecord(issue) || typeof issue.message !== 'string') {
        return [];
      }

      const path = Array.isArray(issue.path)
        ? issue.path
          .map((segment: unknown) => {
            if (typeof segment === 'string' || typeof segment === 'number') {
              return String(segment);
            }
            if (
              this.isRecord(segment) &&
              (typeof segment.key === 'string' ||
                typeof segment.key === 'number')
            ) {
              return String(segment.key);
            }
            return '';
          })
          .filter(Boolean)
          .join('.')
        : '';

      return [path ? `${path}: ${issue.message}` : issue.message];
    });

    return messages.length > 0 ? messages.join('. ') : undefined;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private getErrorOrigin(
    exception: unknown,
  ): { source: string; type: string } {
    const type =
      exception instanceof Error
        ? exception.name
        : this.isRecord(exception) && typeof exception.name === 'string'
          ? exception.name
          : 'UnknownError';

    if (
      type === 'ZodError' ||
      type === 'ZodValidationException' ||
      (this.isRecord(exception) &&
        typeof exception.getZodError === 'function')
    ) {
      return { source: 'zod', type };
    }

    if (type === 'ValidationError' || type === 'CastError') {
      return { source: 'mongoose', type };
    }

    if (this.isRecord(exception) && exception.code === 11000) {
      return { source: 'mongodb', type };
    }

    if (exception instanceof AppError) {
      return { source: 'application', type };
    }

    if (exception instanceof HttpException) {
      return { source: 'nestjs', type };
    }

    if (exception instanceof Error) {
      return { source: 'application', type };
    }

    return { source: 'unknown', type };
  }
}