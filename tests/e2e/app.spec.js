import { expect, test } from '@playwright/test';

function createVmDetail(name, overrides = {}) {
  return {
    name,
    configured: true,
    exists: false,
    status: 'unknown',
    network: { mode: 'nat-auto', vm_ip: '192.168.100.50' },
    storedConfigPath: `/configs/${name}.yaml`,
    storedConfig: {
      vm: {
        name,
        user: 'matt',
        ram_mb: 4096,
        vcpus: 2,
        disk_gb: 40,
      },
      network: { mode: 'nat-auto' },
    },
    ...overrides,
  };
}

async function mockClientApi(page) {
  const state = {
    vms: [createVmDetail('devbox')],
  };

  await page.route('**/health', async (route) => {
    await route.fulfill({ json: { ok: true } });
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

  await page.route('**/api/vms/*', async (route) => {
    const url = new URL(route.request().url());
    const vmName = decodeURIComponent(url.pathname.split('/').pop());

    if (vmName === 'configs' && route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      const clonedVmName = body.config.vm.name;
      state.vms.push(createVmDetail(clonedVmName));
      await route.fulfill({
        status: 201,
        json: {
          vmName: clonedVmName,
          configPath: `/configs/${clonedVmName}.yaml`,
          rawConfig: 'vm: {}',
          config: body.config,
        },
      });
      return;
    }

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
  await mockClientApi(page);
  await page.goto('/');

  await expect(page.getByRole('button', { name: /clone config/i })).toBeVisible();
  await page.getByRole('button', { name: /clone config/i }).click();
  await expect(page.getByRole('dialog', { name: /clone config/i })).toBeVisible();
  await expect(page.getByLabel('New VM name')).toHaveValue('devbox-2');

  const cloneResponsePromise = page.waitForResponse((response) => {
    return response.request().method() === 'POST' && response.url().endsWith('/api/vms/configs');
  });
  await page.getByRole('button', { name: /save cloned config/i }).click();
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
