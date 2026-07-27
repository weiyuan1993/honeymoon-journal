export interface AuthBindings {
  GOOGLE_CLIENT_ID: string;
  AUTHORIZED_EDITOR_EMAILS: string;
  SESSION_SECRET: string;
  APP_ORIGIN?: string;
}

export interface GoogleIdentity {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

export interface EditorIdentity extends GoogleIdentity {
  role: 'editor';
}

export interface SessionClaims extends EditorIdentity {
  version: 1;
  issuedAt: number;
  expiresAt: number;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    retryable: boolean;
    requestId: string;
  };
}

export interface ApiSuccessBody<T> {
  data: T;
}
