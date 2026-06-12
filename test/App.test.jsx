import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
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

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (input) => {
    const url = typeof input === 'string' ? input : input.url;

    if (url.endsWith('/health')) {
      return createJsonResponse({ ok: true });
    }

    if (url.endsWith('/api/vms')) {
      return createJsonResponse({
        vms: [
          {
            name: 'devbox',
            configured: true,
            exists: false,
            status: 'unknown',
            network: { mode: 'nat-auto', vm_ip: '192.168.100.50' },
          },
        ],
      });
    }

    if (url.includes('/api/vms/devbox/logs')) {
      return createJsonResponse({ name: 'devbox', lines: 200, log: 'boot message\n' });
    }

    if (url.endsWith('/api/vms/devbox')) {
      return createJsonResponse({
        vm: {
          name: 'devbox',
          configured: true,
          exists: false,
          status: 'unknown',
          network: { mode: 'nat-auto', vm_ip: '192.168.100.50' },
          storedConfigPath: '/configs/devbox.yaml',
          storedConfig: {
            vm: {
              name: 'devbox',
              user: 'matt',
              ram_mb: 4096,
              vcpus: 2,
              disk_gb: 40,
            },
            network: { mode: 'nat-auto' },
          },
        },
      });
    }

    throw new Error(`Unhandled fetch URL in test: ${url}`);
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('renders the configured inventory and exposes the provision action', async () => {
  renderApp();

  expect(await screen.findByRole('button', { name: /provision saved config/i })).toBeInTheDocument();
});

test('opens the clone dialog with a suggested unique VM name', async () => {
  const user = userEvent.setup();
  renderApp();

  const cloneButton = await screen.findByRole('button', { name: /clone config/i });
  await user.click(cloneButton);

  expect(await screen.findByRole('dialog', { name: /clone config/i })).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByLabelText(/new vm name/i)).toHaveValue('devbox-2');
  });
});
