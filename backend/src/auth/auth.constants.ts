export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

export type TokenType = 'access' | 'refresh';
export interface JwtPayload {
  sub: string;
  type: TokenType;
  role?: string;
  jti?: string; // refresh tokens only
}