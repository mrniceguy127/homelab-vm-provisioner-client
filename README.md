# homelab-vm-provisioner-client

React + Material UI client for `homelab-vm-provisioner-api`.

When this repository is checked out as part of the full `homelab-vm-provisioner` workspace, prefer the workspace root `setup`, `build`, and `start` scripts for end-to-end setup and local runs.

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

For the full workspace setup, including Python provisioner setup, API packages, and client packages, run this from the workspace root:

```bash
./setup
```

If system packages are already installed on the host, run:

```bash
./setup --skip-system-packages
```

After setup completes, build the workspace:

```bash
./build
```

For a rebuild after dependencies are already installed:

```bash
./build
```

`npm run build` in this repository builds the client app and documentation (no tests). The root `./build` script also runs the API build and deploys the client bundle into `homelab-vm-provisioner-proxy/public/`.

For tests, use `./test` from the workspace root or `npm test` / `npm run test:e2e` from this directory.
### Docker Build

You can also build static files using Docker:

```bash
# From the client directory
docker build -t homelab-vm-provisioner-client-builder .

# Extract files (or use the root ./scripts/build-client-docker script)
CONTAINER_ID=$(docker create homelab-vm-provisioner-client-builder)
docker cp "$CONTAINER_ID:/app/dist/." ../homelab-vm-provisioner-proxy/public/
docker rm "$CONTAINER_ID"
```

The Dockerfile creates an ephemeral build container that:
1. Installs dependencies
2. Builds static files with Vite
3. Exits after completion

This is useful for CI/CD pipelines or environments where you want isolated builds.
## Run

```bash
npm run dev
```

The client expects the API to be running separately, typically at `http://localhost:3001`.

When using the full workspace, the usual split-dev flow is:

1. Start the API from the workspace root with `./start`
2. Start the client dev server in this repository with `npm run dev`

By default, the Vite dev server proxies these paths to `http://localhost:3001`:

- `/health`
- `/api/*`

That means the API can stay on port `3001` while the client runs on `5173` without changing the UI configuration.

For production-style local use, the built client bundle is served directly by the reverse proxy after the root `./build` script deploys it into `homelab-vm-provisioner-proxy/public/`.

## API Base URL

The UI includes an API base URL field.

- Leave it blank to use the Vite dev proxy.
- Set it explicitly when the API is deployed elsewhere.

You can also preconfigure it with:

```bash
VITE_API_BASE_URL=http://localhost:3001
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

**Build** (app + docs, no tests):
```bash
npm run build         # Build app and docs
npm run build:app     # Build app only
```

**Test**:
```bash
npm test              # Lint + unit tests
npm run coverage      # Lint + tests + coverage report
npm run test:e2e      # Playwright E2E tests
```

**Docs**:
```bash
npm run docs:build
```

Helper scripts mirroring the provisioner workflow are also available:

```bash
./scripts/test
./scripts/coverage
./scripts/docs-build
```

---

# UI Features

## Dashboard Views

### VM Inventory
- Grid layout showing all configured VMs
- Status chips with real-time state (running, stopped, unknown)
- Quick actions: View Details, Start, Stop, Delete
- Responsive Material-UI cards

### VM Detail View
- Comprehensive VM information panel
- Live status indicator
- Network configuration (IP, MAC, gateway, CIDR)
- Port forwarding table
- Admin SSH key path
- Quick actions: Start, Stop, Clone, Delete
- Snapshot management
- Live log viewer

### Network Management
- User/tenant list
- Network group list with subnet allocations
- Create new network groups
- View network group details (subnet, gateway, DHCP range, profile)

## VM Operations

### Create VM
- Form-based VM configuration
- Owner user and network group selection
- Resource limits (RAM, vCPUs, disk)
- Network policy toggles:
  - Allow same-group traffic
  - Allow internet access
  - Allow hypervisor host access
  - Allow private LAN access (admin-only)
- SSH public key upload or paste
- Optional setup script upload or paste
- Package installation list
- Port forwarding configuration
- Trust level selection (trusted/untrusted)
- Save config only or provision immediately

### Clone VM
- Select source VM
- New VM name and user
- Inherits source VM configuration
- Sanitizes runtime fields (MAC, IP, etc.)
- Network group assignment
- SSH key and setup script support

### Start/Stop VM
- One-click start/stop from inventory or detail view
- Visual feedback with loading states
- Error handling with user-friendly messages

### Delete VM
- Confirmation dialog
- Destroys VM but retains saved config for reprovisioning
- Cleans up libvirt resources and state files

## Snapshot Management

### Create Snapshot
- One-click snapshot creation
- Auto-generated snapshot IDs with timestamps
- Stores disk state and VM metadata

### Restore Snapshot
- Select from available snapshots
- Restores VM disk and configuration
- Reconciles networking after restore

### Delete Snapshot
- Permanently removes snapshot artifacts
- Confirmation dialog

## Log Viewing

### Snapshot Logs
- View last N lines (configurable, 200 default)
- Displays `/var/log/libvirt/qemu/<vm>.log`

### Live Log Streaming
- Server-Sent Events (SSE) for real-time updates
- Auto-scrolls to latest output
- Configurable line limit (100 default)
- Connection status indicator
- Keep-alive messages every 15 seconds

## Network Policy

Per-VM firewall controls (via reconciler):
- **Same-group traffic**: Allow/deny traffic between VMs in same network group
- **Internet access**: Enable/disable WAN connectivity
- **Host access**: Allow/deny traffic to hypervisor host
- **Private LAN access**: Admin-only toggle for LAN access (untrusted VMs always blocked)

Policy changes trigger network reconciliation to update nftables rules.

## Material-UI Components

The client uses Material-UI (MUI) v7 components:
- `Card`, `CardContent`, `CardActions` for VM cards
- `TextField`, `Select`, `Switch` for form inputs
- `Button`, `IconButton` for actions
- `Dialog`, `DialogTitle`, `DialogContent` for modals
- `Chip` for status indicators
- `Table`, `TableRow`, `TableCell` for data display
- `Alert` for error messages
- `CircularProgress` for loading states
- `AppBar`, `Toolbar` for navigation

Dark mode is enabled by default via `createTheme({ palette: { mode: 'dark' } })`.

---

# Project Structure

```text
src/
├── App.jsx                # Main app component, routing
├── main.jsx              # React entrypoint
├── theme.js              # Material-UI theme config
├── components/
│   ├── Dashboard.jsx     # VM inventory grid
│   ├── VMDetail.jsx      # VM detail view
│   ├── CreateVMDialog.jsx    # VM creation form
│   ├── CloneVMDialog.jsx     # VM cloning form
│   ├── NetworkList.jsx   # Network groups list
│   ├── UserList.jsx      # User/tenant list
│   ├── SnapshotManager.jsx   # Snapshot operations
│   └── LogViewer.jsx     # Log display and streaming
├── api.js                # API client (fetch wrapper)
├── utils.js              # Helper functions
test/
├── App.test.jsx          # Unit tests
tests/
└── e2e.spec.js           # Playwright E2E tests
```

## Key Files

| File | Purpose |
|------|---------|
| `src/App.jsx` | Main router, navigation, theme provider |
| `src/api.js` | API client with base URL handling |
| `src/theme.js` | Dark mode Material-UI theme |
| `src/components/Dashboard.jsx` | VM grid, status chips, quick actions |
| `src/components/VMDetail.jsx` | Detailed VM view, operations |
| `src/components/CreateVMDialog.jsx` | VM creation form with validation |
| `src/components/CloneVMDialog.jsx` | VM cloning form |
| `src/components/SnapshotManager.jsx` | Snapshot CRUD operations |
| `src/components/LogViewer.jsx` | SSE log streaming |
| `vite.config.js` | Vite build config, dev proxy |
| `vitest.config.js` | Vitest test config |
| `playwright.config.js` | Playwright E2E config |

---

# Testing

## Unit Tests

Located in `test/`:
- Component rendering tests
- API client tests
- Utility function tests
- Uses `vitest` + `@testing-library/react`
- Requires jsdom for DOM simulation

Run tests:
```bash
npm test
```

## E2E Tests

Located in `tests/`:
- Full user workflows
- Uses Playwright
- Tests against running dev server
- Headless by default

Run E2E tests:
```bash
npm run test:e2e
```

## Coverage

Generate coverage report:
```bash
npm run coverage
```

Output: `.build/coverage/html/index.html`

---
