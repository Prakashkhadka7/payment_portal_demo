export type Role = 'SALES' | 'REVIEWER' | 'ADMIN';

export type Permission =
  | 'application:read'
  | 'application:create'
  | 'application:edit'
  | 'application:submit'
  | 'application:review'
  | 'application:assign'
  | 'sensitive:reveal';

export interface AuthUser {
  readonly id: string;
  readonly username: string;
  readonly displayName: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
}

export interface LoginRequest {
  readonly username: string;
  readonly password: string;
}

export interface AuthSession {
  readonly accessToken: string;
  readonly expiresIn: number;
  readonly user: AuthUser;
}
