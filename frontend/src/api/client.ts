/** Centralized HTTP API client with structured error handling. */

const BASE_URL = '/api/v1';

export class ApiError extends Error {
  public status: number;
  public details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}`;
    let errorDetails: any = null;
    try {
      const errJson = await response.json();
      errorMessage = errJson.message || errJson.detail || errorMessage;
      errorDetails = errJson.details || errJson;
    } catch {
      // Fallback to text if not json
      const text = await response.text();
      if (text) errorMessage = text;
    }
    throw new ApiError(errorMessage, response.status, errorDetails);
  }

  return response.json() as Promise<T>;
}
