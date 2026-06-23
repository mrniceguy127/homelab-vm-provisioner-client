import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { CssBaseline, ThemeProvider } from '@mui/material';

import App from '../src/App.jsx';
import { appTheme } from '../src/theme.js';

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

function renderApp() {
  return render(
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>,
  );
}

function createVmDetail(overrides = {}) {
  const name = overrides.name || 'devbox';

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
    storedConfigPath: `/configs/${name}.yaml`,
    storedConfig: {
      vm: {
        name,
        user: 'matt',
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
        group_name: 'default-admin',
        subnet_cidr: '10.80.0.0/28',
      },
    },
    ...overrides,
  };
}

function createInventoryVm(detailVm) {
  return {
    name: detailVm.name,
    configured: detailVm.configured,
    exists: detailVm.exists,
    status: detailVm.status,
    network: detailVm.network,
    snapshots: detailVm.snapshots,
  };
}

function stubClientApi(detailVm = createVmDetail()) {
  vi.stubGlobal('fetch', vi.fn(async (input) => {
    const url = typeof input === 'string' ? input : input.url;

    if (url.endsWith('/health')) {
      return createJsonResponse({ ok: true });
    }

    if (url.endsWith('/api/users')) {
      return createJsonResponse({
        users: [{ id: 'user-admin', username: 'admin', role: 'admin' }],
      });
    }

    if (url.endsWith('/api/config')) {
      return createJsonResponse({
        limits: {
          maxRamMb: 8192,
          maxVcpus: 4,
          maxDiskGb: 20,
        },
      });
    }

    if (url.endsWith('/api/network-groups')) {
      return createJsonResponse({
        networkGroups: [{
          id: 'ng-admin',
          owner_user_id: 'user-admin',
          name: 'default-admin',
          profile: 'isolated_nat',
          subnet_cidr: '10.80.0.0/28',
        }],
      });
    }

    if (url.endsWith('/api/vms')) {
      return createJsonResponse({
        vms: [createInventoryVm(detailVm)],
      });
    }

    if (url.endsWith('/api/configs')) {
      return createJsonResponse({
        configs: detailVm.configured ? [{
          id: '1',
          vm_name: detailVm.name,
          owner_user_id: detailVm.owner_user_id,
          network_group_id: detailVm.network_group_id,
          target_host_id: 'local',
          config: detailVm.storedConfig,
          ssh_public_key: null,
          setup_script: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }] : [],
      });
    }

    if (url.includes(`/api/vms/${detailVm.name}/logs`)) {
      return createJsonResponse({ name: detailVm.name, lines: 200, log: 'boot message\n' });
    }

    if (url.endsWith(`/api/vms/${detailVm.name}`)) {
      return createJsonResponse({ vm: detailVm });
    }

    throw new Error(`Unhandled fetch URL in test: ${url}`);
  }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('renders the configured inventory and exposes the provision action', async () => {
  const user = userEvent.setup();
  // Use a config-only VM (not deployed) to test provision button
  stubClientApi(createVmDetail({ exists: false, status: 'unknown' }));
  renderApp();

  // Navigate to VM Templates tab where config-only VMs are shown
  const templatesTab = await screen.findByRole('tab', { name: /vm templates/i });
  await user.click(templatesTab);

  // Wait for the config to appear in the list
  const vmNameElements = await screen.findAllByText(/devbox/i);
  expect(vmNameElements.length).toBeGreaterThan(0);

  // Click on the config to select it
  await user.click(vmNameElements[0]);

  // Should see the Deploy button for config-only VMs
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /deploy/i })).toBeInTheDocument();
  });
});

test('opens the full clone dialog with a suggested unique name and cleared conflict-prone fields', async () => {
  const user = userEvent.setup();
  stubClientApi(createVmDetail({
    exists: true,
    status: 'running',
    ports: [{ host: 2222, guest: 22, proto: 'tcp' }],
    storedConfig: {
      vm: {
        name: 'devbox',
        user: 'matt',
        owner_user_id: 'user-admin',
        network_group_id: 'ng-admin',
        ram_mb: 4096,
        vcpus: 2,
        disk_gb: 40,
        ssh_key_file: '/keys/devbox.pub',
      },
      network: {
        mode: 'isolated_nat',
        profile: 'isolated_nat',
        network_group_id: 'ng-admin',
        group_name: 'default-admin',
      },
      ports: [{ host: 2222, guest: 22, proto: 'tcp' }],
    },
  }));
  renderApp();

  // Navigate to VMs tab first
  const vmsTab = await screen.findByRole('tab', { name: /runtime vms/i });
  await user.click(vmsTab);

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /full clone/i })).toBeEnabled();
  });
  const cloneButton = screen.getByRole('button', { name: /full clone/i });
  await user.click(cloneButton);

  expect(await screen.findByRole('dialog', { name: /create a full vm clone/i })).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByLabelText(/target vm name/i)).toHaveValue('devbox-2');
  });
  expect(screen.getByText(/default-admin \(isolated_nat\)/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/forwarded ports/i)).toHaveValue('');
  expect(screen.getByLabelText(/existing absolute ssh key path/i)).toHaveValue('');
});

test('shows snapshots tab contents and stable start stop controls for a live VM', async () => {
  const user = userEvent.setup();
  stubClientApi(createVmDetail({
    exists: true,
    status: 'running',
    snapshots: [
      {
        snapshot_id: '20260612T101500Z',
        created_at: '2026-06-12T10:15:00Z',
      },
    ],
  }));
  renderApp();

  // Navigate to VMs tab first
  const vmsTab = await screen.findByRole('tab', { name: /runtime vms/i });
  await user.click(vmsTab);

  expect(await screen.findByRole('button', { name: /^start$/i })).toBeDisabled();
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /^stop$/i })).toBeEnabled();
  });

  await user.click(screen.getByRole('tab', { name: /snapshots/i }));

  expect((await screen.findAllByRole('button', { name: /create snapshot/i })).length).toBeGreaterThan(0);
  expect(screen.getByText('20260612T101500Z')).toBeInTheDocument();
});
