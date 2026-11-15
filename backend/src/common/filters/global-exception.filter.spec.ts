import { ArgumentsHost } from '@nestjs/common';
import { Request, Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { GlobalExceptionFilter } from './global-exception.filter.js';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let response: Pick<Response, 'status' | 'json'>;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('returns detailed Zod validation messages instead of the generic message', () => {
    const exception = new ZodValidationException({
      issues: [
        {
          code: 'too_small',
          path: ['username'],
          message: 'Username must be at least 3 characters',
        },
        {
          code: 'invalid_format',
          path: ['email'],
          message: 'Invalid email address',
        },
      ],
    });
    const host = createArgumentsHost(response);

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      status: 'fail',
      error: {
        source: 'zod',
        type: 'ZodValidationException',
      },
      message:
        'username: Username must be at least 3 characters. email: Invalid email address',
    });
  });

  it('returns all field-level Zod issue messages', () => {
    const exception = new ZodValidationException({
      issues: [
        {
          path: ['username'],
          message: 'Username is required',
        },
        {
          path: ['email'],
          message: 'Invalid email address',
        },
      ],
    });
    const host = createArgumentsHost(response);

    filter.catch(exception, host);

    expect(response.json).toHaveBeenCalledWith({
      status: 'fail',
      error: {
        source: 'zod',
        type: 'ZodValidationException',
      },
      message: 'username: Username is required. email: Invalid email address',
    });
  });

  it('identifies and returns Mongoose validation errors', () => {
    const exception = Object.assign(new Error('Validation failed'), {
      name: 'ValidationError',
      errors: {
        username: { message: 'Username must be at least 3 characters' },
      },
    });
    const host = createArgumentsHost(response);

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      status: 'fail',
      error: {
        source: 'mongoose',
        type: 'ValidationError',
      },
      message: 'Username must be at least 3 characters',
    });
  });

  it('identifies unexpected application errors without exposing them in production', () => {
    const exception = new TypeError('Internal implementation detail');
    const host = createArgumentsHost(response);

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      status: 'error',
      error: {
        source: 'application',
        type: 'TypeError',
      },
      message: 'Internal Server Error',
    });
  });
});

function createArgumentsHost(
  response: Pick<Response, 'status' | 'json'>,
): ArgumentsHost {
  const request = {
    method: 'POST',
    originalUrl: '/api/v1/auth/signup',
    url: '/api/v1/auth/signup',
  } as Request;

  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
}
