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

test('fetchVm retrieves a single VM detail', async () => {
  const vm = { name: 'devbox', status: 'running' };
  fetch.mockResolvedValue(createJsonResponse({ vm }));

  const result = await requestJson('', '/api/vms/devbox');

  expect(result).toEqual({ vm });
});

test('fetchVmState retrieves VM state', async () => {
  const state = { status: 'running', uptime: 3600 };
  fetch.mockResolvedValue(createJsonResponse({ state }));

  const result = await requestJson('', '/api/vms/devbox/state');

  expect(result).toEqual({ state });
});

test('createVm posts to the create VM endpoint', async () => {
  const { createVm } = await import('../src/api.js');
  
  fetch.mockResolvedValue(createJsonResponse({ ok: true }));

  await createVm('', { config: { vm: { name: 'testvm' } } });

  expect(fetch).toHaveBeenCalledWith('/api/vms', expect.objectContaining({ method: 'POST' }));
});

test('provisionSavedVm posts to the provision endpoint', async () => {
  const { provisionSavedVm } = await import('../src/api.js');
  
  fetch.mockResolvedValue(createJsonResponse({ ok: true }));

  await provisionSavedVm('', 'devbox');

  expect(fetch).toHaveBeenCalledWith(
    '/api/vms/devbox/provision',
    expect.objectContaining({ method: 'POST' })
  );
});

test('destroyVm posts to the destroy endpoint', async () => {
  const { destroyVm } = await import('../src/api.js');
  
  fetch.mockResolvedValue(createJsonResponse({ ok: true }));

  await destroyVm('', 'devbox');

  expect(fetch).toHaveBeenCalledWith(
    '/api/vms/devbox',
    expect.objectContaining({ method: 'DELETE' })
  );
});

test('startVm posts to the start endpoint', async () => {
  const { startVm } = await import('../src/api.js');
  
  fetch.mockResolvedValue(createJsonResponse({ ok: true }));

  await startVm('', 'devbox');

  expect(fetch).toHaveBeenCalledWith(
    '/api/vms/devbox/start',
    expect.objectContaining({ method: 'POST' })
  );
});

test('stopVm posts to the stop endpoint', async () => {
  const { stopVm } = await import('../src/api.js');
  
  fetch.mockResolvedValue(createJsonResponse({ ok: true }));

  await stopVm('', 'devbox');

  expect(fetch).toHaveBeenCalledWith(
    '/api/vms/devbox/stop',
    expect.objectContaining({ method: 'POST' })
  );
});

test('createVmSnapshot posts to the snapshot endpoint', async () => {
  const { createVmSnapshot } = await import('../src/api.js');
  
  fetch.mockResolvedValue(createJsonResponse({ ok: true }));

  await createVmSnapshot('', 'devbox');

  expect(fetch).toHaveBeenCalledWith(
    '/api/vms/devbox/snapshots',
    expect.objectContaining({ method: 'POST' })
  );
});

test('restoreVmSnapshot posts to the restore snapshot endpoint', async () => {
  const { restoreVmSnapshot } = await import('../src/api.js');
  
  fetch.mockResolvedValue(createJsonResponse({ ok: true }));

  await restoreVmSnapshot('', 'devbox', 'snap-123');

  expect(fetch).toHaveBeenCalledWith(
    '/api/vms/devbox/snapshots/snap-123/restore',
    expect.objectContaining({ method: 'POST' })
  );
});

test('deleteVmSnapshot deletes a snapshot', async () => {
  const { deleteVmSnapshot } = await import('../src/api.js');
  
  fetch.mockResolvedValue(createJsonResponse({ ok: true }));

  await deleteVmSnapshot('', 'devbox', 'snap-123');

  expect(fetch).toHaveBeenCalledWith(
    '/api/vms/devbox/snapshots/snap-123',
    expect.objectContaining({ method: 'DELETE' })
  );
});

test('fetchJob retrieves a job by ID', async () => {
  const { fetchJob } = await import('../src/api.js');
  const job = { job_id: 'job-123', status: 'succeeded' };
  
  fetch.mockResolvedValue(createJsonResponse({ job }));

  const result = await fetchJob('', 'job-123');

  expect(result).toEqual({ job });
});

test('fetchJobEvents retrieves job events with limit', async () => {
  const { fetchJobEvents } = await import('../src/api.js');
  const events = [{ event_id: 1, event_type: 'job_created' }];
  
  fetch.mockResolvedValue(createJsonResponse({ events }));

  await fetchJobEvents('', 'job-123', 50);

  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining('/api/jobs/job-123/events'),
    expect.anything()
  );
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining('limit=50'),
    expect.anything()
  );
});
