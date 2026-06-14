import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import {
  buildAbsoluteUrl,
  buildApiUrl,
  buildRelativeUrl,
  buildVmLogStreamUrl,
  cloneVm,
  createNetworkGroup,
  fetchNetworkGroups,
  fetchUsers,
  normalizeBaseUrl,
  requestJson,
  updateVmPolicy,
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

test('cloneVm posts to the clone API route', async () => {
  fetch.mockResolvedValue(createJsonResponse({ ok: true }));

  await cloneVm('', 'devbox', { config: { vm: { name: 'clonebox' } } });

  expect(fetch).toHaveBeenCalledWith('/api/vms/devbox/clone', expect.objectContaining({ method: 'POST' }));
});

test('fetchUsers hits the users API route', async () => {
  fetch.mockResolvedValue(createJsonResponse({ users: [] }));

  await fetchUsers('');

  expect(fetch).toHaveBeenCalledWith('/api/users', expect.anything());
});

test('fetchNetworkGroups hits the network-group API route', async () => {
  fetch.mockResolvedValue(createJsonResponse({ networkGroups: [] }));

  await fetchNetworkGroups('');

  expect(fetch).toHaveBeenCalledWith('/api/network-groups', expect.anything());
});

test('createNetworkGroup posts to the network-group API route', async () => {
  fetch.mockResolvedValue(createJsonResponse({ networkGroup: { id: 'ng-test' } }));

  await createNetworkGroup('', { ownerUserId: 'user-admin', name: 'default-admin' });

  expect(fetch).toHaveBeenCalledWith(
    '/api/network-groups',
    expect.objectContaining({ method: 'POST' }),
  );
});

test('updateVmPolicy patches the VM policy route', async () => {
  fetch.mockResolvedValue(createJsonResponse({ ok: true }));

  await updateVmPolicy('', 'devbox', { allow_same_group_traffic: false });

  expect(fetch).toHaveBeenCalledWith(
    '/api/vms/devbox/policy',
    expect.objectContaining({ method: 'PATCH' }),
  );
});
