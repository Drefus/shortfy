import { expect, test } from '@playwright/test';

test('a aplicação responde no endpoint de saúde', async ({ request }) => {
  const response = await request.get('/health');

  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual({ status: 'ok' });
});
