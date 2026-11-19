import type { ApiErrorBody } from '../types/finance';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!baseUrl) {
    throw new ApiError('The FinPilot API is not configured.', 0, 'API_NOT_CONFIGURED');
  }
  if (!accessToken) {
    throw new ApiError('Sign in to access your private finance data.', 401, 'AUTH_REQUIRED');
  }

  let response: Response;
  try {
    response = await fetch(new URL(path, baseUrl), {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    throw new ApiError('FinPilot could not reach the server. Try again shortly.', 0, 'NETWORK_ERROR');
  }

  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      // Keep the public error generic if the API did not return its error envelope.
    }
    throw new ApiError(
      body?.error.message ?? 'Something went wrong. Please try again.',
      response.status,
      body?.error.code ?? 'REQUEST_FAILED',
      body?.error.requestId,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
