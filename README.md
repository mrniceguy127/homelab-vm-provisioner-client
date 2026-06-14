# homelab-vm-provisioner-client

React + Material UI client for `homelab-vm-provisioner-api`.

When this repository is checked out as part of the full `homelab-vm-provisioner-webapp` workspace, prefer the workspace root `setup`, `build`, and `start` scripts for end-to-end setup and local runs.

## Features

- Dark-mode dashboard built with Material UI
- VM inventory overview with live status chips
- Detailed VM inspection view
- Config save and VM create flows
- Tenant/network-group aware VM create and full-clone flows
- Provision saved configs into VMs later from the detail view
- Full VM clone dialog with VM renaming and sanitized runtime fields
- VM start and stop actions
- VM destroy action
- Restore point create, restore, and delete actions
- Snapshot log viewer
- Live log streaming over Server-Sent Events
- Optional post-cloud-init setup script submission

## Stack

- React
- Vite
- Material UI

## Install

For client-only dependency setup:

```bash
npm install
```

If you did not clone the full workspace with submodules, initialize them first:

```bash
git submodule update --init --recursive
```

For the full workspace setup, including Python provisioner setup, API packages, client packages, client build, and deployment of the built client into the API's `public/` directory, run this from the workspace root:

```bash
./setup
```

If system packages are already installed on the host, run:

```bash
./setup --skip-system-packages
```

For a repeatable rebuild after dependencies are already installed, run:

```bash
./build
```

`npm run build` in this repository builds only the client app, tests, coverage, and generated docs. The root `./build` script also runs the API build and deploys the client bundle into `homelab-vm-provisioner-api/public/`.

## Run

```bash
npm run dev
```

The client expects the API to be running separately, typically at `http://localhost:3000`.

When using the full workspace, the usual split-dev flow is:

1. Start the API from the workspace root with `./start`
2. Start the client dev server in this repository with `npm run dev`

By default, the Vite dev server proxies these paths to `http://localhost:3000`:

- `/health`
- `/api/*`

That means the API can stay on port `3000` while the client runs on `5173` without changing the UI configuration.

For production-style local use, the built client bundle is served directly by the API after the root `./setup` or `./build` script deploys it into `homelab-vm-provisioner-api/public/`.

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
- VM create/clone flows now select or create a user-owned network group instead of hand-authoring one-off NAT networks.
- New network groups allocate `/28` subnets from the API's global pool by default.
- The detail view exposes per-VM same-group traffic, internet access, hypervisor host access, and admin-only private LAN access toggles.
- The create and clone flows can either upload setup script content or reference an existing absolute setup script path.
- The inventory intentionally shows only VMs that already have saved configs in the API.
- Provisioned VMs can be full-cloned to a new unique VM name from the detail header.
- VM names are checked for uniqueness in the UI against visible configured VMs and enforced again by the API against all libvirt VM names on the host.
- The detail view includes start, stop, snapshot, and log actions for configured VMs.
- Forwarded ports are modeled per VM and rendered against the VM's assigned managed IP inside its network group.
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
