import { describe, expect, it } from 'vitest';
import { buildApp } from '../../src/server/app.js';

describe('local server scaffold', () => {
  it('responds to the health probe without opening a listener', async () => {
    const app = buildApp();
    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    await app.close();
  });
});
