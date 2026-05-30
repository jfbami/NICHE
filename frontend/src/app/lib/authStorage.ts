const TOKEN_KEY = "neesh.token";
const USER_KEY = "neesh.user";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export function readToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function readUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function persistSession(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
