import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { AppError } from '../errors/app-error.js';
import { normalizeError } from '../errors/normalize-error.js';

type Req = Request & { id?: string };

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalExceptionFilter');
  private readonly isDev = process.env.NODE_ENV === 'development';

  catch(exception: unknown, host: ArgumentsHost) {
    const error = normalizeError(exception);

    if (host.getType() !== 'http') {
      this.log(error);
      throw exception;
    }

    const http = host.switchToHttp();
    const req = http.getRequest<Req>();
    const res = http.getResponse<Response>();

    try {
      this.log(error, req);
      if (res.headersSent) return;
      res.status(error.getStatus()).json(this.buildBody(error, req));
    } catch (failure) {
      this.logger.error('Filter failed', failure instanceof Error ? failure.stack : String(failure));
      if (!res.headersSent) res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  }

  private buildBody(error: AppError, req: Req) {
    const status = error.getStatus();
    const expose = error.isOperational || this.isDev;

    return {
      status: status >= 500 ? 'error' : 'fail',
      code: expose ? error.code : 'INTERNAL_ERROR',
      message: expose ? error.message : 'Internal server error',
      ...(expose && error.details ? { details: error.details } : {}),
      requestId: req.id,
      ...(this.isDev && {
        stack: error.stack,
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
      }),
    };
  }

  private log(error: AppError, req?: Req) {
    const status = error.getStatus();
    const line = `[${req?.id ?? '-'}] ${req ? `${req.method} ${req.originalUrl}` : 'non-http'} -> ${status} ${error.code}: ${error.message}`;

    if (status >= 500) {
      const cause = error.cause instanceof Error ? error.cause.stack : String(error.cause ?? 'none');
      this.logger.error(line, `${error.stack}\nCAUSE: ${cause}`);
    } else {
      this.logger.warn(line);
    }
  }
}