import { ApiResponse, ApiErrorResponse } from '@furniture/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // sends cookies
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorData = data as ApiErrorResponse | null;
    const message = errorData?.error?.message || `Request failed with status ${response.status}`;
    const code = errorData?.error?.code || 'UNKNOWN_ERROR';
    throw new ApiError(Array.isArray(message) ? message.join(', ') : String(message), response.status, code);
  }

  const apiResponse = data as ApiResponse<T>;
  return apiResponse.data !== undefined ? apiResponse.data : (data as T);
}
