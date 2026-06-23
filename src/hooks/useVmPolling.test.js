/**
 * Tests for useVmPolling hook.
 */

import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useVmPolling } from './useVmPolling.js';
import { createJsonResponse, createTestVm, createTestJob } from '../../test/test-utils.jsx';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('useVmPolling', () => {
  test('tracks a job for a VM', () => {
    const onVmsUpdate = vi.fn();
    const showMessage = vi.fn();
    
    const { result } = renderHook(() => useVmPolling('', onVmsUpdate, showMessage, false));
    
    act(() => {
      result.current.trackJob('test-vm', { job_id: 'job-123', status: 'pending', type: 'start_vm' });
    });
    
    expect(result.current.activeJobs.size).toBe(1);
    expect(result.current.activeJobs.get('test-vm')).toMatchObject({
      job_id: 'job-123',
      status: 'pending',
      type: 'start_vm',
    });
  });

  test('clears a job for a VM', () => {
    const onVmsUpdate = vi.fn();
    const showMessage = vi.fn();
    
    const { result } = renderHook(() => useVmPolling('', onVmsUpdate, showMessage, false));
    
    act(() => {
      result.current.trackJob('test-vm', { job_id: 'job-123', status: 'pending', type: 'start_vm' });
    });
    
    expect(result.current.activeJobs.size).toBe(1);
    
    act(() => {
      result.current.clearJob('test-vm');
    });
    
    expect(result.current.activeJobs.size).toBe(0);
  });

  test('returns pending operation for active job', () => {
    const onVmsUpdate = vi.fn();
    const showMessage = vi.fn();
    
    const { result } = renderHook(() => useVmPolling('', onVmsUpdate, showMessage, false));
    
    act(() => {
      result.current.trackJob('test-vm', { job_id: 'job-123', status: 'pending', type: 'start_vm' });
    });
    
    expect(result.current.getPendingOperation('test-vm')).toBe('start_vm');
  });

  test('returns null pending operation for succeeded job', () => {
    const onVmsUpdate = vi.fn();
    const showMessage = vi.fn();
    
    const { result } = renderHook(() => useVmPolling('', onVmsUpdate, showMessage, false));
    
    act(() => {
      result.current.trackJob('test-vm', { job_id: 'job-123', status: 'succeeded', type: 'start_vm' });
    });
    
    expect(result.current.getPendingOperation('test-vm')).toBeNull();
  });

  test('returns null pending operation for failed job', () => {
    const onVmsUpdate = vi.fn();
    const showMessage = vi.fn();
    
    const { result } = renderHook(() => useVmPolling('', onVmsUpdate, showMessage, false));
    
    act(() => {
      result.current.trackJob('test-vm', { job_id: 'job-123', status: 'failed', type: 'start_vm' });
    });
    
    expect(result.current.getPendingOperation('test-vm')).toBeNull();
  });

  test('identifies busy VM with active job', () => {
    const onVmsUpdate = vi.fn();
    const showMessage = vi.fn();
    
    const { result } = renderHook(() => useVmPolling('', onVmsUpdate, showMessage, false));
    
    act(() => {
      result.current.trackJob('test-vm', { job_id: 'job-123', status: 'pending', type: 'start_vm' });
    });
    
    expect(result.current.isVmBusy('test-vm')).toBe(true);
  });

  test('identifies non-busy VM without active job', () => {
    const onVmsUpdate = vi.fn();
    const showMessage = vi.fn();
    
    const { result } = renderHook(() => useVmPolling('', onVmsUpdate, showMessage, false));
    
    expect(result.current.isVmBusy('test-vm')).toBe(false);
  });

  test('polls and updates VMs when jobs are active', async () => {
    const vm1 = createTestVm({ name: 'vm1', status: 'running' });
    const vm2 = createTestVm({ name: 'vm2', status: 'running' });
    const job = createTestJob({ job_id: 'job-123', status: 'succeeded', target_vm_name: 'vm1' });
    
    fetch.mockImplementation(async (url) => {
      if (typeof url === 'string' && url.includes('/api/vms')) {
        return createJsonResponse({ vms: [vm1, vm2] });
      }
      if (typeof url === 'string' && url.includes('/api/jobs/job-123')) {
        return createJsonResponse({ job });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    
    const onVmsUpdate = vi.fn();
    const showMessage = vi.fn();
    
    const { result } = renderHook(() => useVmPolling('', onVmsUpdate, showMessage, false));
    
    act(() => {
      result.current.trackJob('vm1', { job_id: 'job-123', status: 'in_progress', type: 'start_vm' });
    });
    
    // Manually trigger polling
    await act(async () => {
      await result.current.refreshVms();
    });
    
    expect(onVmsUpdate).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith('/api/vms', expect.anything());
  });

  test('refreshes VMs immediately', async () => {
    const vm1 = createTestVm({ name: 'vm1', status: 'running' });
    
    fetch.mockResolvedValue(createJsonResponse({ vms: [vm1] }));
    
    const onVmsUpdate = vi.fn();
    const showMessage = vi.fn();
    
    const { result } = renderHook(() => useVmPolling('', onVmsUpdate, showMessage, false));
    
    await act(async () => {
      await result.current.refreshVms();
    });
    
    expect(fetch).toHaveBeenCalledWith('/api/vms', expect.anything());
    expect(onVmsUpdate).toHaveBeenCalledWith([vm1]);
  });

  test('handles VM refresh errors silently', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetch.mockRejectedValue(new Error('Network error'));
    
    const onVmsUpdate = vi.fn();
    const showMessage = vi.fn();
    
    const { result } = renderHook(() => useVmPolling('', onVmsUpdate, showMessage, false));
    
    await act(async () => {
      await result.current.refreshVms();
    });
    
    // Background refresh errors are logged, not shown to user
    expect(consoleErrorSpy).toHaveBeenCalledWith('Background VM refresh failed:', 'Network error');
    expect(showMessage).not.toHaveBeenCalled();
    expect(onVmsUpdate).not.toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
  });

  test('cleans up polling interval on unmount', () => {
    fetch.mockResolvedValue(createJsonResponse({ vms: [] }));
    
    const onVmsUpdate = vi.fn();
    const showMessage = vi.fn();
    
    const { unmount } = renderHook(() => useVmPolling('', onVmsUpdate, showMessage, true));
    
    // Clear any initial fetch calls from hook initialization
    fetch.mockClear();
    
    // Unmount the hook
    unmount();
    
    // Advance timers - polling should not continue after unmount
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    
    // Should not have called fetch after unmount
    expect(fetch).not.toHaveBeenCalled();
  });

  test('disables polling when enabled is false', () => {
    const onVmsUpdate = vi.fn();
    const showMessage = vi.fn();
    
    const { result } = renderHook(() => useVmPolling('', onVmsUpdate, showMessage, false));
    
    act(() => {
      result.current.trackJob('test-vm', { job_id: 'job-123', status: 'pending', type: 'start_vm' });
    });
    
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    
    expect(fetch).not.toHaveBeenCalled();
  });
});
