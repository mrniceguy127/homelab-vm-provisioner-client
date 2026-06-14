import { expect, test } from '@playwright/test';

function createVmDetail(name, overrides = {}) {
  return {
    name,
    configured: true,
    exists: false,
    status: 'unknown',
    owner_user_id: 'user-admin',
    network_group_id: 'ng-admin',
    network: {
      mode: 'isolated_nat',
      profile: 'isolated_nat',
      group_name: 'default-admin',
      network_group_id: 'ng-admin',
      subnet_cidr: '10.80.0.0/28',
      vm_ip: '10.80.0.2',
      mac: '52:54:00:11:22:33',
    },
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

async function mockClientApi(page, initialVms = [createVmDetail('devbox')]) {
  const state = {
    vms: initialVms,
  };

  await page.route('**/health', async (route) => {
    await route.fulfill({ json: { ok: true } });
  });

  await page.route('**/api/users', async (route) => {
    await route.fulfill({ json: { users: [{ id: 'user-admin', username: 'admin', role: 'admin' }] } });
  });

  await page.route('**/api/network-groups', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          networkGroups: [{
            id: 'ng-admin',
            owner_user_id: 'user-admin',
            name: 'default-admin',
            profile: 'isolated_nat',
            subnet_cidr: '10.80.0.0/28',
          }],
        },
      });
      return;
    }

    const body = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      json: {
        networkGroup: {
          id: 'ng-new',
          owner_user_id: body.ownerUserId,
          name: body.name,
          profile: body.profile || 'isolated_nat',
          subnet_cidr: '10.80.0.16/28',
        },
      },
    });
  });

  await page.route('**/api/vms', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        json: {
          vms: state.vms.map((vm) => ({
            name: vm.name,
            configured: vm.configured,
            exists: vm.exists,
            status: vm.status,
            network: vm.network,
          })),
        },
      });
      return;
    }

    if (method === 'POST') {
      const body = route.request().postDataJSON();
      const vmName = body.config.vm.name;
      const detail = createVmDetail(vmName);
      state.vms.push(detail);
      await route.fulfill({
        status: 201,
        json: {
          vmName,
          configPath: `/configs/${vmName}.yaml`,
          rawConfig: 'vm: {}',
          config: body.config,
        },
      });
      return;
    }

    await route.abort();
  });

  await page.route('**/api/vms/configs', async (route) => {
    const body = route.request().postDataJSON();
    const vmName = body.config.vm.name;
    const detail = createVmDetail(vmName);
    state.vms.push(detail);
    await route.fulfill({
      status: 201,
      json: {
        vmName,
        configPath: `/configs/${vmName}.yaml`,
        rawConfig: 'vm: {}',
        config: body.config,
      },
    });
  });

  await page.route('**/api/vms/*/provision', async (route) => {
    const vmName = route.request().url().split('/').slice(-2, -1)[0];
    const vm = state.vms.find((entry) => entry.name === vmName);
    if (vm) {
      vm.exists = true;
      vm.status = 'running';
    }

    await route.fulfill({
      status: 201,
      json: {
        name: vmName,
        configPath: `/configs/${vmName}.yaml`,
        provisioned: {
          success: true,
          config_path: `/configs/${vmName}.yaml`,
        },
      },
    });
  });

  await page.route('**/api/vms/*/logs*', async (route) => {
    const vmName = route.request().url().split('/').slice(-2, -1)[0];
    await route.fulfill({ json: { name: vmName, lines: 200, log: 'boot message\n' } });
  });

  await page.route('**/api/vms/*/clone', async (route) => {
    const sourceVmName = route.request().url().split('/').slice(-2, -1)[0];
    const body = route.request().postDataJSON();
    const clonedVmName = body.config.vm.name;
    state.vms.push(createVmDetail(clonedVmName, { exists: true, status: 'running' }));
    await route.fulfill({
      status: 201,
      json: {
        sourceName: sourceVmName,
        vmName: clonedVmName,
        configPath: `/configs/${clonedVmName}.yaml`,
        rawConfig: 'vm: {}',
        config: body.config,
        cloned: {
          success: true,
          source_name: sourceVmName,
          config_path: `/configs/${clonedVmName}.yaml`,
        },
      },
    });
  });

  await page.route('**/api/vms/*', async (route) => {
    const url = new URL(route.request().url());
    const vmName = decodeURIComponent(url.pathname.split('/').pop());

    const vm = state.vms.find((entry) => entry.name === vmName);

    if (!vm) {
      await route.fulfill({ status: 404, json: { error: `VM was not found: ${vmName}` } });
      return;
    }

    await route.fulfill({
      json: { vm },
    });
  });
}

test('clones a saved config to a new VM name', async ({ page }) => {
  await mockClientApi(page, [createVmDetail('devbox', { exists: true, status: 'running' })]);
  await page.goto('/');

  await expect(page.getByRole('button', { name: /full clone/i })).toBeVisible();
  await page.getByRole('button', { name: /full clone/i }).click();
  await expect(page.getByRole('dialog', { name: /create a full vm clone/i })).toBeVisible();
  await expect(page.getByLabel('Target VM name')).toHaveValue('devbox-2');

  const cloneResponsePromise = page.waitForResponse((response) => {
    return response.request().method() === 'POST' && response.url().endsWith('/api/vms/devbox/clone');
  });
  await page.getByRole('button', { name: /create full clone/i }).click();
  const cloneResponse = await cloneResponsePromise;
  expect(cloneResponse.status()).toBe(201);
});

test('provisions a saved config from the detail view', async ({ page }) => {
  await mockClientApi(page);
  await page.goto('/');

  await expect(page.getByRole('button', { name: /provision saved config/i })).toBeVisible();
  await page.getByRole('button', { name: /provision saved config/i }).click();
  await expect(page.locator('.MuiChip-root').filter({ hasText: /^Running$/ }).first()).toBeVisible();
});
