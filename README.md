# homelab-vm-provisioner-client

React + Material UI client for `homelab-vm-provisioner-api`.

## Features

- Dark-mode dashboard built with Material UI
- VM inventory overview with live status chips
- Detailed VM inspection view
- Config save and VM create flows
- Provision saved configs into VMs later from the detail view
- Config cloning popup with VM renaming
- VM destroy action
- Snapshot log viewer
- Live log streaming over Server-Sent Events

## Stack

- React
- Vite
- Material UI

## Install

```bash
npm install
```

For the full workspace setup, including Python provisioner setup, API packages, client packages, client build, and deployment of the built client into the API's `public/` directory, run this from the workspace root:

```bash
./setup --skip-system-packages
```

For a repeatable rebuild after dependencies are already installed, run:

```bash
./build
```

## Run

```bash
npm run dev
```

By default, the Vite dev server proxies these paths to `http://localhost:3000`:

- `/health`
- `/api/*`

That means the API can stay on port `3000` while the client runs on `5173` without changing the UI configuration.

For production-style local use, the built client bundle is served directly by the API after the root `./setup` script deploys it into `homelab-vm-provisioner-api/public/`.

## API Base URL

The UI includes an API base URL field.

- Leave it blank to use the Vite dev proxy.
- Set it explicitly when the API is deployed elsewhere.

You can also preconfigure it with:

```bash
VITE_API_BASE_URL=http://localhost:3000
```

## Notes

- The log stream view follows the API's SSE endpoint at `GET /api/vms/:name/logs/stream`.
- The create dialog supports both config-only saves and immediate VM provisioning.
- The inventory intentionally shows only VMs that already have saved configs in the API.
- Saved configs can be cloned to a new unique VM name from the detail header.
- VM names are checked for uniqueness in the UI against visible configured VMs and enforced again by the API against all libvirt VM names on the host.
- The destroy action removes the VM through the API but leaves the saved API config intact for reprovisioning.

## Developer Commands

```bash
npm test
npm run coverage
npm run test:e2e
npm run docs:build
npm run build
```

Helper scripts mirroring the provisioner workflow are also available:

```bash
./scripts/test
./scripts/coverage
./scripts/docs-build
```
