import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { CookieService } from './cookie.service.js';
import { TokenService } from './token.service.js';
import type { JwtPayload } from './auth.constants.js';

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly cookieService: CookieService,
    private readonly tokenService: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.cookieService.getAccess(request);
    if (!token) {
      throw new UnauthorizedException('Access token is required');
    }

    const payload = await this.tokenService.verifyAccess(token);
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid access token');
    }
    request.user = payload;
    return true;
  }
}
