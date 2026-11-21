import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';

describe('GET /health', () => {
  it('responde 200 com status ok em JSON', async () => {
    const response = await request(createApp()).get('/health');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('não expõe o cabeçalho x-powered-by', async () => {
    const response = await request(createApp()).get('/health');

    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});
