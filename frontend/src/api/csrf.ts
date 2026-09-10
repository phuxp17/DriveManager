import { CsrfResponse } from './types';

let currentToken: string | null = null;
let currentHeaderName: string = 'X-CSRF-TOKEN';
let inflightFetch: Promise<CsrfResponse> | null = null;

export function getCsrfToken(): string | null {
  return currentToken;
}

export function getCsrfHeaderName(): string {
  return currentHeaderName;
}

export function setCsrf(headerName: string, token: string): void {
  currentHeaderName = headerName;
  currentToken = token;
}

export function clearCsrf(): void {
  currentToken = null;
  currentHeaderName = 'X-CSRF-TOKEN';
  inflightFetch = null;
}

export async function fetchCsrf(): Promise<CsrfResponse> {
  if (inflightFetch) {
    return inflightFetch;
  }

  inflightFetch = fetch('/api/v1/auth/csrf', {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`Failed to fetch CSRF token: ${res.status}`);
      }
      const data: CsrfResponse = await res.json();
      setCsrf(data.headerName, data.token);
      return data;
    })
    .finally(() => {
      inflightFetch = null;
    });

  return inflightFetch;
}
