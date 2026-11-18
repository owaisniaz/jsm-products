import {
  Injectable,
} from '@nestjs/common';
import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import { map } from 'rxjs';
import type { Observable } from 'rxjs';
import type { Request, Response } from 'express';
import type { ApiSuccessResponse } from '../types/api-response.type.js';

@Injectable()
export class ApiResponseInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        statusCode: response.statusCode,
        message:
          response.statusCode === 201
            ? 'Resource created successfully'
            : 'Request completed successfully',
        data: data ?? null,
        // error: null,
        // timestamp: new Date().toISOString(),
        // path: request.originalUrl,
      })),
    );
  }
}
