import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import {
  buildAbsoluteUrl,
  buildApiUrl,
  buildRelativeUrl,
  buildVmLogStreamUrl,
  normalizeBaseUrl,
  requestJson,
} from '../src/api.js';

function createJsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: () => 'application/json',
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('normalizeBaseUrl trims whitespace and trailing slashes', () => {
  expect(normalizeBaseUrl(' https://example.test/api/ ')).toBe('https://example.test/api');
});

test('buildRelativeUrl preserves same-origin routing and query params', () => {
  expect(buildRelativeUrl('/api/vms', { lines: 42 })).toBe('/api/vms?lines=42');
});

test('buildAbsoluteUrl uses the provided base URL', () => {
  expect(buildAbsoluteUrl('https://example.test/api', '/health')).toBe('https://example.test/health');
});

test('buildApiUrl falls back to relative URLs when no base is provided', () => {
  expect(buildApiUrl('', '/api/vms/devbox/logs', { lines: 5 })).toBe('/api/vms/devbox/logs?lines=5');
});

test('buildVmLogStreamUrl appends the line count', () => {
  expect(buildVmLogStreamUrl('', 'devbox', 77)).toBe('/api/vms/devbox/logs/stream?lines=77');
});

test('requestJson throws an error for failed API responses', async () => {
  fetch.mockResolvedValue(createJsonResponse({ error: 'boom', details: ['x'] }, 500));

  await expect(requestJson('', '/api/vms')).rejects.toMatchObject({
    message: 'boom',
    statusCode: 500,
    details: ['x'],
  });
});
