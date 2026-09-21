import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from './api';

describe('API Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getHealth should fetch from /health and return service info', async () => {
    const mockHealth = { status: 'Healthy', service: 'SecureOps.Api' };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockHealth,
    } as Response);

    const result = await api.getHealth();
    expect(result).toEqual(mockHealth);
    expect(globalThis.fetch).toHaveBeenCalledWith('/health', expect.any(Object));
  });

  it('getApplications should fetch applications from /api/applications', async () => {
    const mockApps = [
      { id: '1', name: 'payment-api', language: 'C#' },
      { id: '2', name: 'auth-gateway', language: 'C#' },
    ];
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockApps,
    } as Response);

    const result = await api.getApplications();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('payment-api');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/applications', expect.any(Object));
  });

  it('createApplication should send POST request with JSON body', async () => {
    const newApp = {
      name: 'test-service',
      description: 'Test service description',
      repositoryUrl: 'https://github.com/org/test',
      ownerEmail: 'team@company.internal',
      language: 'TypeScript',
      tier: 'Tier2_BusinessCore',
    };
    const createdApp = { ...newApp, id: '123' };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => createdApp,
    } as Response);

    const result = await api.createApplication(newApp);
    expect(result.id).toBe('123');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/applications',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(newApp),
      })
    );
  });

  it('should throw an error with problem details message when API call fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        title: 'Validation Failed',
        detail: 'Application name is required.',
      }),
    } as Response);

    await expect(
      api.createApplication({
        name: '',
        description: '',
        repositoryUrl: '',
        ownerEmail: '',
        language: '',
        tier: 'Tier3_Internal',
      })
    ).rejects.toThrow('Application name is required.');
  });
});
