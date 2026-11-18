export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

export type TokenType = 'access' | 'refresh' | 'invite';
export interface JwtPayload {
  sub: string;
  type: TokenType;
  role?: string;
  activeCompanyId?: string;
  accountType?: 'OWNER' | 'STAFF';
  jti?: string; // refresh tokens only
}