import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './api';

describe('apiRequest authentication boundary', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('does not make a request without an access token', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:4000');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await expect(apiRequest('/api/v1/dashboard', '')).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
      status: 401,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns a typed configuration error without sending a request', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await expect(apiRequest('/api/v1/dashboard', 'access-token')).rejects.toMatchObject({
      code: 'API_NOT_CONFIGURED',
      status: 0,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
