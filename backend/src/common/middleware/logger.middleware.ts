// src/common/middleware/logger.middleware.ts
import { Injectable } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`tttt [${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    // You can also log more info:
    // console.log('Headers:', req.headers);
    // console.log('Body:', req.body);
    // console.log('IP:', req.ip);

    next();
  }
}