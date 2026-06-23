/**
 * Shared test utilities and helpers.
 */

import { render } from '@testing-library/react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { appTheme } from '../src/theme.js';

/**
 * Render a component with theme provider.
 *
 * @param {import('react').ReactElement} ui - Component to render.
 * @param {object} options - Render options.
 * @returns {import('@testing-library/react').RenderResult} Render result.
 */
export function renderWithProviders(ui, options = {}) {
  function Wrapper({ children }) {
    return (
      <ThemeProvider theme={appTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

/**
 * Create a mock fetch response.
 *
 * @param {any} body - Response body.
 * @param {number} status - HTTP status code.
 * @returns {Promise<Response>} Mock response.
 */
export function createJsonResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name) => (name === 'content-type' ? 'application/json' : null),
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

/**
 * Create a test VM object.
 *
 * @param {object} overrides - Property overrides.
 * @returns {object} Test VM.
 */
export function createTestVm(overrides = {}) {
  const name = overrides.name || 'test-vm';
  
  return {
    name,
    configured: true,
    exists: true,
    status: 'running',
    owner_user_id: 'user-admin',
    network_group_id: 'ng-admin',
    allow_same_group_traffic: true,
    allow_host_access: true,
    allow_private_lan_access: false,
    internet_access: true,
    mac_address: '52:54:00:11:22:33',
    ip_address: '10.80.0.2',
    trust: 'trusted',
    network: {
      mode: 'isolated_nat',
      profile: 'isolated_nat',
      group_name: 'default-admin',
      network_group_id: 'ng-admin',
      subnet_cidr: '10.80.0.0/28',
      vm_ip: '10.80.0.2',
      mac: '52:54:00:11:22:33',
    },
    snapshots: [],
    ...overrides,
  };
}

/**
 * Create a test config object.
 *
 * @param {object} overrides - Property overrides.
 * @returns {object} Test config.
 */
export function createTestConfig(overrides = {}) {
  const name = overrides.name || 'test-vm';
  
  return {
    id: '1',
    vm_name: name,
    owner_user_id: 'user-admin',
    network_group_id: 'ng-admin',
    target_host_id: 'local',
    config: {
      vm: {
        name,
        user: 'testuser',
        owner_user_id: 'user-admin',
        network_group_id: 'ng-admin',
        ram_mb: 4096,
        vcpus: 2,
        disk_gb: 40,
      },
      network: {
        mode: 'isolated_nat',
        profile: 'isolated_nat',
        network_group_id: 'ng-admin',
      },
    },
    ssh_public_key: null,
    setup_script: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a test job object.
 *
 * @param {object} overrides - Property overrides.
 * @returns {object} Test job.
 */
export function createTestJob(overrides = {}) {
  return {
    job_id: 'job-123',
    type: 'create_vm',
    status: 'pending',
    target_vm_name: 'test-vm',
    target_host_id: 'local',
    priority: 10,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a test network group object.
 *
 * @param {object} overrides - Property overrides.
 * @returns {object} Test network group.
 */
export function createTestNetworkGroup(overrides = {}) {
  return {
    id: 'ng-admin',
    owner_user_id: 'user-admin',
    name: 'default-admin',
    profile: 'isolated_nat',
    subnet_cidr: '10.80.0.0/28',
    ...overrides,
  };
}

/**
 * Create a test user object.
 *
 * @param {object} overrides - Property overrides.
 * @returns {object} Test user.
 */
export function createTestUser(overrides = {}) {
  return {
    id: 'user-admin',
    username: 'admin',
    role: 'admin',
    ...overrides,
  };
}

/**
 * Wait for a condition to be true.
 *
 * @param {Function} condition - Condition function.
 * @param {number} timeout - Max wait time in ms.
 * @param {number} interval - Poll interval in ms.
 * @returns {Promise<void>}
 */
export async function waitForCondition(condition, timeout = 5000, interval = 50) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (condition()) {
      return;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, interval);
    });
  }
  
  throw new Error('Condition not met within timeout');
}
