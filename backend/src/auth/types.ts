export interface SignupResponse {
  id: string;
  username: string;
  email: string;
  photo?: string;
  roles: string[];
}

export interface AuthSession {
  user: SignupResponse;
  tokens: {
    accessToken: string;
    refreshToken: string;
    refreshJti: string;
    refreshExpiresAt: Date;
  };
}

export interface SessionMetadata {
  userAgent?: string;
  ip?: string;
}

export interface ActiveSession {
  jti: string;
  userAgent: string | null;
  ip: string | null;
  lastUsedAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
}