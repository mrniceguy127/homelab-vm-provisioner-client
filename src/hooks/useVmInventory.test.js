/**
 * Tests for useVmInventory hook.
 */

import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useVmInventory } from './useVmInventory.js';
import { createJsonResponse, createTestVm, createTestConfig } from '../../test/test-utils.jsx';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useVmInventory', () => {
  test('initializes with empty state and loading true', () => {
    const showMessage = vi.fn();
    
    const { result } = renderHook(() => useVmInventory('', showMessage));
    
    expect(result.current.vms).toEqual([]);
    expect(result.current.configs).toEqual([]);
    expect(result.current.inventoryLoading).toBe(true);
  });

  test('refreshes inventory and updates state', async () => {
    const vm1 = createTestVm({ name: 'vm1' });
    const config1 = createTestConfig({ vm_name: 'config1' });
    
    fetch.mockImplementation(async (url) => {
      if (typeof url === 'string' && url.includes('/api/vms')) {
        return createJsonResponse({ vms: [vm1] });
      }
      if (typeof url === 'string' && url.includes('/api/configs')) {
        return createJsonResponse({ configs: [config1] });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    
    const showMessage = vi.fn();
    
    const { result } = renderHook(() => useVmInventory('', showMessage));
    
    // Initial state
    expect(result.current.inventoryLoading).toBe(true);
    expect(result.current.vms).toEqual([]);
    expect(result.current.configs).toEqual([]);
    
    // Trigger refresh
    await act(async () => {
      await result.current.refreshInventory();
    });
    
    expect(result.current.inventoryLoading).toBe(false);
    expect(result.current.vms).toEqual([vm1]);
    expect(result.current.configs).toEqual([config1]);
  });

  test('handles inventory refresh errors', async () => {
    fetch.mockRejectedValue(new Error('Network error'));
    
    const showMessage = vi.fn();
    
    const { result } = renderHook(() => useVmInventory('', showMessage));
    
    await act(async () => {
      await result.current.refreshInventory();
    });
    
    expect(result.current.inventoryLoading).toBe(false);
    expect(showMessage).toHaveBeenCalledWith('Network error', 'error');
  });

  test('returns preferred VM name after refresh', async () => {
    const vm1 = createTestVm({ name: 'vm1' });
    const config1 = createTestConfig({ vm_name: 'config1' });
    
    fetch.mockImplementation(async (url) => {
      if (typeof url === 'string' && url.includes('/api/vms')) {
        return createJsonResponse({ vms: [vm1] });
      }
      if (typeof url === 'string' && url.includes('/api/configs')) {
        return createJsonResponse({ configs: [config1] });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    
    const showMessage = vi.fn();
    
    const { result } = renderHook(() => useVmInventory('', showMessage));
    
    let returnedName;
    await act(async () => {
      returnedName = await result.current.refreshInventory('test-vm');
    });
    
    expect(returnedName).toBe('test-vm');
  });

  test('sets loading to false even on error', async () => {
    fetch.mockRejectedValue(new Error('Network error'));
    
    const showMessage = vi.fn();
    
    const { result } = renderHook(() => useVmInventory('', showMessage));
    
    expect(result.current.inventoryLoading).toBe(true);
    
    await act(async () => {
      await result.current.refreshInventory();
    });
    
    expect(result.current.inventoryLoading).toBe(false);
  });

  test('fetches both VMs and configs in parallel', async () => {
    const vm1 = createTestVm({ name: 'vm1' });
    const config1 = createTestConfig({ vm_name: 'config1' });
    
    fetch.mockImplementation(async (url) => {
      if (typeof url === 'string' && url.includes('/api/vms')) {
        return createJsonResponse({ vms: [vm1] });
      }
      if (typeof url === 'string' && url.includes('/api/configs')) {
        return createJsonResponse({ configs: [config1] });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    
    const showMessage = vi.fn();
    
    const { result } = renderHook(() => useVmInventory('', showMessage));
    
    await act(async () => {
      await result.current.refreshInventory();
    });
    
    // Both endpoints should have been called
    expect(fetch).toHaveBeenCalledWith('/api/vms', expect.anything());
    expect(fetch).toHaveBeenCalledWith('/api/configs', expect.anything());
  });
});
