/**
 * Shared authentication utilities
 * Ensures consistent token handling across all pages and API calls
 */

const TOKEN_KEY = 'auth_token';

/**
 * Get the current auth token from localStorage
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Create a fetch wrapper that automatically includes the auth token
 */
export async function createAuthorizedFetch(
  input: RequestInfo,
  init: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(input, { ...init, headers });
}
