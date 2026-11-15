import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from './access-token.guard.js';
import { AuthService } from './auth.service.js';
import { CookieService } from './cookie.service.js';
import type { SignupResponse } from './types.js';
import { LoginDto, UserDto } from './dtos/user.dto.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
  ) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(
    @Body() body: UserDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SignupResponse> {
    const session = await this.authService.signup(
      body,
      this.getSessionMetadata(request),
    );
    this.cookieService.set(response, session.tokens);
    return session.user;
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  async signin(
    @Body() body: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SignupResponse> {
    const session = await this.authService.signin(
      body,
      this.getSessionMetadata(request),
    );
    this.cookieService.set(response, session.tokens);
    return session.user;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SignupResponse> {
    const refreshToken = this.cookieService.getRefresh(request);
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const session = await this.authService.refresh(refreshToken);
    this.cookieService.set(response, session.tokens);
    return session.user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const refreshToken = this.cookieService.getRefresh(request);
    try {
      if (refreshToken) {
        await this.authService.logout(refreshToken);
      }
    } finally {
      this.cookieService.clear(response);
    }
  }

  @Post('logout-all')
  @UseGuards(AccessTokenGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    try {
      await this.authService.logoutAll(request.user.sub);
    } finally {
      this.cookieService.clear(response);
    }
  }

  @Get('sessions')
  @UseGuards(AccessTokenGuard)
  sessions(@Req() request: AuthenticatedRequest) {
    return this.authService.sessions(
      request.user.sub,
      this.cookieService.getRefresh(request),
    );
  }

  @Delete('sessions/:jti')
  @UseGuards(AccessTokenGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeSession(
    @Req() request: AuthenticatedRequest,
    @Param('jti', new ParseUUIDPipe()) jti: string,
  ): Promise<void> {
    return this.authService.revokeSession(request.user.sub, jti);
  }

  private getSessionMetadata(request: Request) {
    const userAgent = request.get('user-agent')?.slice(0, 512);
    return {
      ...(userAgent ? { userAgent } : {}),
      ...(request.ip ? { ip: request.ip } : {}),
    };
  }
}
