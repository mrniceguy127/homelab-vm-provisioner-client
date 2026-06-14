import { startTransition, useDeferredValue, useEffect, useState } from 'react';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import BackupRoundedIcon from '@mui/icons-material/BackupRounded';
import CloudDoneRoundedIcon from '@mui/icons-material/CloudDoneRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DnsRoundedIcon from '@mui/icons-material/DnsRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import RestoreRoundedIcon from '@mui/icons-material/RestoreRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import StopRoundedIcon from '@mui/icons-material/StopRounded';
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';

import {
  buildVmLogStreamUrl,
  cloneVm,
  createNetworkGroup,
  createVm,
  createVmSnapshot,
  deleteVmSnapshot,
  destroyVm,
  fetchHealth,
  fetchNetworkGroups,
  fetchUsers,
  fetchVm,
  fetchVmLogs,
  fetchVms,
  provisionSavedVm,
  restoreVmSnapshot,
  saveVmConfig,
  startVm,
  stopVm,
  updateVmPolicy,
} from './api.js';

export const MAX_VM_NAME_LENGTH = 63;

const baseFormState = {
  name: '',
  user: '',
  ownerUserId: '',
  networkGroupId: '',
  newNetworkGroupName: '',
  newNetworkGroupProfile: 'isolated_nat',
  ramMb: '4096',
  vcpus: '2',
  diskGb: '40',
  allowSudo: true,
  allowSameGroupTraffic: true,
  allowHostAccess: true,
  allowPrivateLanAccess: false,
  internetAccess: true,
  trust: 'untrusted',
  packagesText: '',
  dnsResolversText: '',
  portsText: '',
  sshPublicKey: '',
  sshKeyFile: '',
  setupScript: '',
  setupScriptFile: '',
};

/**
 * Create a fresh VM form state object.
 *
 * @returns {object} Default UI form state.
 */
export function createDefaultFormState() {
  return { ...baseFormState };
}

/**
 * Parse a required positive integer form field.
 *
 * @param {string|number} value - Raw field value.
 * @param {string} label - Human-readable field label.
 * @returns {number} Parsed integer value.
 */
export function parsePositiveInteger(value, label) {
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return parsed;
}

/**
 * Parse an optional line-count input with bounds checking.
 *
 * @param {string|number|undefined|null} value - Raw field value.
 * @param {number} fallback - Fallback line count when omitted.
 * @returns {number} Parsed line count.
 */
export function parseLineCount(value, fallback) {
  if (value === '' || value === undefined || value === null) {
    return fallback;
  }

  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 5000) {
    throw new Error('Line counts must be between 1 and 5000.');
  }

  return parsed;
}

/**
 * Parse a comma-separated text field into trimmed values.
 *
 * @param {string} text - Raw comma-separated input.
 * @returns {string[]} Parsed values.
 */
export function parseCommaSeparatedList(text) {
  return text
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * Parse forwarded port rules from the create form.
 *
 * @param {string} text - One rule per line using `host:guest` or `host:guest/proto`.
 * @returns {Array<{host:number,guest:number,proto:string}>} Parsed port rules.
 */
export function parsePortRules(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const match = line.match(/^(\d+)\s*:\s*(\d+)(?:\s*\/\s*(tcp|udp))?$/i);
      if (!match) {
        throw new Error(`Port rule ${index + 1} must use host:guest or host:guest/proto.`);
      }

      return {
        host: Number.parseInt(match[1], 10),
        guest: Number.parseInt(match[2], 10),
        proto: (match[3] || 'tcp').toLowerCase(),
      };
    });
}

/**
 * Normalize a VM name for comparisons.
 *
 * @param {string} value - Raw VM name.
 * @returns {string} Trimmed lower-cased VM name.
 */
export function normalizeVmName(value) {
  return String(value || '').trim().toLowerCase();
}

/**
 * Escape regular expression metacharacters in a string.
 *
 * @param {string} value - Raw string value.
 * @returns {string} Escaped string.
 */
export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate a unique clone name within the configured VM inventory.
 *
 * @param {string} sourceVmName - Source VM name.
 * @param {Iterable<string>} existingVmNames - Existing configured VM names.
 * @returns {string} Suggested unique clone name.
 */
export function buildUniqueCloneName(sourceVmName, existingVmNames) {
  const normalizedSourceVmName = String(sourceVmName || '').trim() || 'vm';
  const existingNames = new Set([...existingVmNames].map((name) => normalizeVmName(name)));

  for (let index = 2; index < 1000; index += 1) {
    const suffix = `-${index}`;
    const baseLength = Math.max(1, MAX_VM_NAME_LENGTH - suffix.length);
    const candidate = `${normalizedSourceVmName.slice(0, baseLength)}${suffix}`;
    if (!existingNames.has(normalizeVmName(candidate))) {
      return candidate;
    }
  }

  return '';
}

/**
 * Clone an existing VM config under a new VM name.
 *
 * @param {object} config - Source config payload.
 * @param {string} newVmName - New VM name.
 * @returns {object} Cloned config payload.
 */
export function buildClonedConfig(config, newVmName) {
  if (!config?.vm || typeof config.vm !== 'object') {
    throw new Error('The selected VM does not have a clonable config payload.');
  }

  const clonedConfig = JSON.parse(JSON.stringify(config));
  const previousVmName = String(clonedConfig.vm.name || '').trim();
  clonedConfig.vm.name = String(newVmName || '').trim();
  delete clonedConfig.vm.mac_address;
  delete clonedConfig.vm.ip_address;
  delete clonedConfig.vm.ssh_key_file;
  delete clonedConfig.network;
  delete clonedConfig.ports;

  if (clonedConfig.paths?.vm_data_dir) {
    if (previousVmName) {
      const trailingVmPathPattern = new RegExp(`([/\\\\])${escapeRegExp(previousVmName)}$`);
      if (trailingVmPathPattern.test(clonedConfig.paths.vm_data_dir)) {
        clonedConfig.paths.vm_data_dir = clonedConfig.paths.vm_data_dir.replace(
          trailingVmPathPattern,
          `$1${clonedConfig.vm.name}`,
        );
      } else {
        delete clonedConfig.paths.vm_data_dir;
      }
    } else {
      delete clonedConfig.paths.vm_data_dir;
    }

    if (Object.keys(clonedConfig.paths).length === 0) {
      delete clonedConfig.paths;
    }
  }

  return clonedConfig;
}

/**
 * Convert a config payload into form state values.
 *
 * @param {object} config - Saved VM config payload.
 * @returns {object} Form state derived from the config.
 */
export function buildFormStateFromConfig(config) {
  const vm = config?.vm || {};
  const network = config?.network || {};
  const dnsResolvers = config?.dns?.resolvers || [];
  const ports = config?.ports || [];

  return {
    ...createDefaultFormState(),
    name: vm.name || '',
    user: vm.user || '',
    ramMb: vm.ram_mb ? String(vm.ram_mb) : createDefaultFormState().ramMb,
    vcpus: vm.vcpus ? String(vm.vcpus) : createDefaultFormState().vcpus,
    diskGb: vm.disk_gb ? String(vm.disk_gb) : createDefaultFormState().diskGb,
    ownerUserId: vm.owner_user_id || network.owner_user_id || '',
    networkGroupId: vm.network_group_id || network.network_group_id || '',
    allowSudo: Boolean(vm.allow_sudo),
    allowSameGroupTraffic: vm.allow_same_group_traffic !== false,
    allowHostAccess: vm.allow_host_access !== false,
    allowPrivateLanAccess: Boolean(vm.allow_private_lan_access),
    internetAccess: vm.internet_access !== false,
    trust: vm.trust || createDefaultFormState().trust,
    packagesText: (config?.packages || []).join(', '),
    dnsResolversText: dnsResolvers.join(', '),
    portsText: ports
      .map((port) => `${port.host}:${port.guest}/${(port.proto || 'tcp').toLowerCase()}`)
      .join('\n'),
    sshKeyFile: vm.ssh_key_file || '',
    setupScriptFile: config?.scripts?.setup_script_file || '',
  };
}

/**
 * Build clone dialog form state from a source config.
 *
 * @param {object} config - Source config payload.
 * @param {string} newVmName - Suggested target VM name.
 * @returns {object} Sanitized clone form state.
 */
export function buildCloneFormState(config, newVmName) {
  return buildFormStateFromConfig(buildClonedConfig(config, newVmName));
}

/**
 * Convert the UI form state into an API request payload.
 *
 * @param {object} formState - Current create/clone dialog form state.
 * @returns {{config: object, sshPublicKey?: string, setupScript?: string}} Request payload.
 */
export function buildVmPayload(formState) {
  const vm = {
    name: formState.name.trim(),
    user: formState.user.trim(),
    owner_user_id: String(formState.ownerUserId || '').trim(),
    network_group_id: formState.networkGroupId === '__new__'
      ? '__new__'
      : String(formState.networkGroupId || '').trim(),
    ram_mb: parsePositiveInteger(formState.ramMb, 'RAM'),
    vcpus: parsePositiveInteger(formState.vcpus, 'vCPUs'),
    disk_gb: parsePositiveInteger(formState.diskGb, 'Disk size'),
    allow_same_group_traffic: Boolean(formState.allowSameGroupTraffic),
    allow_host_access: Boolean(formState.allowHostAccess),
    allow_private_lan_access: Boolean(formState.allowPrivateLanAccess),
    internet_access: Boolean(formState.internetAccess),
    trust: formState.trust,
  };

  if (!vm.name) {
    throw new Error('VM name is required.');
  }

  if (!vm.user) {
    throw new Error('Tenant user is required.');
  }

  if (!vm.owner_user_id) {
    throw new Error('Owner user is required.');
  }

  if (!vm.network_group_id) {
    throw new Error('Choose an existing network group or create a new one.');
  }

  if (vm.network_group_id === '__new__' && !String(formState.newNetworkGroupName || '').trim()) {
    throw new Error('A new network group name is required.');
  }

  if (formState.allowSudo) {
    vm.allow_sudo = true;
  }

  if (formState.sshKeyFile.trim() && !formState.sshPublicKey.trim()) {
    vm.ssh_key_file = formState.sshKeyFile.trim();
  }

  const config = { vm };

  const packages = parseCommaSeparatedList(formState.packagesText);
  if (packages.length > 0) {
    config.packages = packages;
  }

  const resolvers = parseCommaSeparatedList(formState.dnsResolversText);
  if (resolvers.length > 0) {
    config.dns = { resolvers };
  }

  const ports = parsePortRules(formState.portsText);
  if (ports.length > 0) {
    config.ports = ports;
  }

  const payload = { config };
  if (formState.sshPublicKey.trim()) {
    payload.sshPublicKey = formState.sshPublicKey.trim();
  }

  if (formState.setupScriptFile.trim()) {
    config.scripts = {
      setup_script_file: formState.setupScriptFile.trim(),
    };
  }

  if (formState.setupScript.trim()) {
    payload.setupScript = formState.setupScript.trim();
  }

  return payload;
}

/**
 * Derive a display chip descriptor for a VM.
 *
 * @param {object|null} vm - VM inventory or detail object.
 * @returns {{label:string,color:string}} UI status descriptor.
 */
export function buildStatusDescriptor(vm) {
  if (!vm) {
    return { label: 'No data', color: 'default' };
  }

  if (vm.exists && String(vm.status).toLowerCase() === 'running') {
    return { label: 'Running', color: 'success' };
  }

  if (vm.exists) {
    return { label: vm.status || 'Present', color: 'warning' };
  }

  if (vm.configured) {
    return { label: 'Config only', color: 'secondary' };
  }

  return { label: 'Missing', color: 'default' };
}

/**
 * Determine whether a VM is currently running.
 *
 * @param {object|null} vm - VM inventory or detail object.
 * @returns {boolean} True when the VM exists and reports a running state.
 */
export function isVmRunning(vm) {
  return Boolean(vm?.exists) && String(vm?.status).toLowerCase() === 'running';
}

/**
 * Pretty-print a value for JSON panels.
 *
 * @param {unknown} value - Value to render.
 * @returns {string} Pretty-printed JSON string.
 */
export function formatJson(value) {
  return JSON.stringify(value ?? {}, null, 2);
}

/**
 * Create a short inventory subtitle for a VM's network state.
 *
 * @param {object|null} vm - VM inventory or detail object.
 * @returns {string} Human-readable network summary.
 */
export function formatNetworkSummary(vm) {
  if (!vm?.network) {
    return 'No discovered network';
  }

  const mode = vm.network.profile || vm.network.mode || 'unknown';
  const groupName = vm.network.group_name || vm.network_group_id;
  const address = vm.ip_address || vm.network.vm_ip || 'IP unavailable';
  return groupName ? `${groupName} • ${mode} • ${address}` : `${mode} • ${address}`;
}

/**
 * Render a dashboard summary metric.
 *
 * @param {object} props - Component props.
 * @param {string} props.title - Metric title.
 * @param {string|number} props.value - Metric value.
 * @param {string} props.caption - Supporting caption.
 * @param {import('react').ReactNode} props.icon - Metric icon.
 * @returns {import('react').JSX.Element} Metric card component.
 */
export function MetricCard({ title, value, caption, icon }) {
  return (
    <Paper
      sx={{
        p: 2.5,
        minHeight: 144,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: (theme) =>
          `linear-gradient(145deg, ${alpha(theme.palette.common.white, 0.06)}, ${alpha(theme.palette.primary.main, 0.08)})`,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h5" sx={{ mt: 1 }}>
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.16),
            color: 'primary.main',
          }}
        >
          {icon}
        </Box>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {caption}
      </Typography>
    </Paper>
  );
}

/**
 * Render a titled JSON text panel.
 *
 * @param {object} props - Component props.
 * @param {string} props.title - Panel title.
 * @param {string} [props.subtitle] - Optional subtitle.
 * @param {string} props.value - Preformatted JSON text.
 * @returns {import('react').JSX.Element} JSON panel component.
 */
export function JsonPanel({ title, subtitle, value }) {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Stack spacing={1.5}>
        <Box>
          <Typography variant="h6">{title}</Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        <Box
          component="pre"
          sx={{
            p: 2,
            borderRadius: 2,
            overflow: 'auto',
            backgroundColor: (theme) => alpha(theme.palette.common.black, 0.24),
            color: 'text.primary',
          }}
        >
          {value}
        </Box>
      </Stack>
    </Paper>
  );
}

/**
 * Render the homelab VM control surface.
 *
 * @returns {import('react').JSX.Element} Root client application.
 */
export default function App() {
  const defaultApiBase = import.meta.env.VITE_API_BASE_URL || '';

  const [apiBaseInput, setApiBaseInput] = useState(defaultApiBase);
  const [apiBase, setApiBase] = useState(defaultApiBase);
  const [health, setHealth] = useState({ state: 'checking', message: 'Checking API' });
  const [users, setUsers] = useState([]);
  const [networkGroups, setNetworkGroups] = useState([]);
  const [vms, setVms] = useState([]);
  const [selectedVmName, setSelectedVmName] = useState('');
  const [selectedVm, setSelectedVm] = useState(null);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [detailTab, setDetailTab] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [cloneSourceVmName, setCloneSourceVmName] = useState('');
  const [formState, setFormState] = useState(createDefaultFormState());
  const [submitState, setSubmitState] = useState('idle');
  const [snapshotLines, setSnapshotLines] = useState('200');
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotLog, setSnapshotLog] = useState('');
  const [streamLines, setStreamLines] = useState('100');
  const [streamEnabled, setStreamEnabled] = useState(false);
  const [streamConnected, setStreamConnected] = useState(false);
  const [streamLog, setStreamLog] = useState('');
  const [streamError, setStreamError] = useState('');
  const [vmActionState, setVmActionState] = useState('idle');
  const [snackbar, setSnackbar] = useState({ open: false, severity: 'info', message: '' });

  const deferredSearchText = useDeferredValue(searchText);
  const knownVmNames = new Set(vms.map((vm) => normalizeVmName(vm.name)));
  const normalizedDraftVmName = normalizeVmName(formState.name);
  const ownerScopedNetworkGroups = networkGroups.filter(
    (group) => !formState.ownerUserId || group.owner_user_id === formState.ownerUserId,
  );
  const selectedVmOwner = users.find((user) => user.id === selectedVm?.owner_user_id) || null;
  const selectedVmNetworkGroup = networkGroups.find((group) => group.id === selectedVm?.network_group_id) || null;

  let draftPayload = null;
  let draftPayloadError = null;
  try {
    draftPayload = buildVmPayload(formState);
  } catch (error) {
    draftPayloadError = error.message;
  }

  if (!draftPayloadError && normalizedDraftVmName && knownVmNames.has(normalizedDraftVmName)) {
    draftPayload = null;
    draftPayloadError = 'VM name must be unique. Choose a different name.';
  }

  const filteredVms = vms.filter((vm) => {
    const searchNeedle = deferredSearchText.trim().toLowerCase();
    if (!searchNeedle) {
      return true;
    }

    return [
      vm.name,
      vm.status,
      vm.ip_address,
      vm.network?.mode,
      vm.network?.profile,
      vm.network?.group_name,
      vm.network_group_id,
      vm.trust,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(searchNeedle));
  });

  const runningCount = vms.filter((vm) => String(vm.status).toLowerCase() === 'running').length;
  const configuredCount = vms.filter((vm) => vm.configured).length;
  const issueCount = vms.filter((vm) => vm.provisionerError || (!vm.exists && !vm.configured)).length;
  const clonableConfig = selectedVm?.storedConfig || selectedVm?.config || null;
  const provisionableConfig = selectedVm?.storedConfig || selectedVm?.config || null;
  const hasClonableConfig = Boolean(clonableConfig);
  const selectedVmIsRunning = isVmRunning(selectedVm);
  const canCloneVm = Boolean(selectedVm?.exists && clonableConfig);
  const canProvisionStoredConfig = Boolean(selectedVm?.configured && !selectedVm?.exists && provisionableConfig);
  const canCreateSnapshot = Boolean(selectedVm?.exists);
  const canStartSelectedVm = Boolean(selectedVm?.exists) && !selectedVmIsRunning;
  const canStopSelectedVm = selectedVmIsRunning;
  const powerStateLabel = !selectedVm?.exists ? 'Not provisioned' : selectedVmIsRunning ? 'Running' : 'Stopped';
  const powerStateColor = !selectedVm?.exists ? 'default' : selectedVmIsRunning ? 'success' : 'warning';
  const snapshots = selectedVm?.snapshots || [];

  /**
   * Show a snackbar message.
   *
   * @param {string} message - Message text.
   * @param {'info'|'success'|'warning'|'error'} [severity='info'] - Snackbar severity.
   * @returns {void}
   */
  function showMessage(message, severity = 'info') {
    setSnackbar({ open: true, severity, message });
  }

  /**
   * Build a blank create form seeded with the first available owner/group.
   *
   * @returns {object} Metadata-aware form state.
   */
  function createMetadataAwareFormState() {
    const nextOwnerUserId = users[0]?.id || '';
    const nextNetworkGroupId = networkGroups.find((group) => group.owner_user_id === nextOwnerUserId)?.id || '';
    return {
      ...createDefaultFormState(),
      ownerUserId: nextOwnerUserId,
      networkGroupId: nextNetworkGroupId,
    };
  }

  /**
   * Refresh the configured VM inventory and API health state.
   *
   * @param {string} [preferredName=selectedVmName] - Preferred VM to keep selected after refresh.
   * @returns {Promise<void>} Resolves after state updates complete.
   */
  async function refreshInventory(preferredName = selectedVmName) {
    setInventoryLoading(true);
    setHealth({ state: 'checking', message: 'Checking API' });

    const [healthResult, userResult, groupResult, inventoryResult] = await Promise.allSettled([
      fetchHealth(apiBase),
      fetchUsers(apiBase),
      fetchNetworkGroups(apiBase),
      fetchVms(apiBase),
    ]);

    if (healthResult.status === 'fulfilled') {
      setHealth({ state: 'ok', message: 'API reachable' });
    } else {
      setHealth({ state: 'error', message: healthResult.reason.message });
    }

    if (userResult.status === 'fulfilled') {
      setUsers(userResult.value.users || []);
    } else {
      showMessage(userResult.reason.message, 'error');
    }

    if (groupResult.status === 'fulfilled') {
      setNetworkGroups(groupResult.value.networkGroups || []);
    } else {
      showMessage(groupResult.reason.message, 'error');
    }

    if (inventoryResult.status === 'fulfilled') {
      const nextVms = inventoryResult.value.vms || [];
      const availableNames = new Set(nextVms.map((vm) => vm.name));
      const nextSelectedName = availableNames.has(preferredName)
        ? preferredName
        : nextVms[0]?.name || '';

      startTransition(() => {
        setVms(nextVms);
        setSelectedVmName(nextSelectedName);
      });
    } else {
      showMessage(inventoryResult.reason.message, 'error');
    }

    setInventoryLoading(false);
  }

  /**
   * Load VM detail data for the currently selected inventory item.
   *
   * @param {string} vmName - Selected VM name.
   * @returns {Promise<void>} Resolves after detail state is updated.
   */
  async function loadVmDetails(vmName) {
    if (!vmName) {
      setSelectedVm(null);
      return;
    }

    setDetailLoading(true);
    try {
      const response = await fetchVm(apiBase, vmName);
      setSelectedVm(response.vm);
    } catch (error) {
      setSelectedVm(null);
      showMessage(error.message, 'error');
    } finally {
      setDetailLoading(false);
    }
  }

  /**
   * Load a log snapshot for the selected VM.
   *
   * @param {string} vmName - Selected VM name.
   * @param {string} [lineCountText=snapshotLines] - Requested line count.
   * @returns {Promise<void>} Resolves after the snapshot text is updated.
   */
  async function loadSnapshot(vmName, lineCountText = snapshotLines) {
    if (!vmName) {
      return;
    }

    try {
      const lines = parseLineCount(lineCountText, 200);
      setSnapshotLoading(true);
      const response = await fetchVmLogs(apiBase, vmName, lines);
      setSnapshotLog(response.log || '');
    } catch (error) {
      setSnapshotLog(`Log snapshot unavailable.\n\n${error.message}`);
      showMessage(error.message, 'warning');
    } finally {
      setSnapshotLoading(false);
    }
  }

  /**
   * Submit the create dialog as either config-only save or full provisioning.
   *
   * @param {'config'|'create'|'clone'} mode - Submission mode.
   * @returns {Promise<void>} Resolves after the request and follow-up refresh finish.
   */
  async function handleFormSubmit(mode) {
    setSubmitState(mode);
    try {
      let effectiveFormState = formState;
      if (formState.networkGroupId === '__new__') {
        const nextNetworkGroupName = formState.newNetworkGroupName.trim();
        if (!formState.ownerUserId || !nextNetworkGroupName) {
          throw new Error('Select an owner and provide a new network group name first.');
        }

        const createdGroup = await createNetworkGroup(apiBase, {
          ownerUserId: formState.ownerUserId,
          name: nextNetworkGroupName,
          profile: formState.newNetworkGroupProfile,
        });
        const nextNetworkGroup = createdGroup.networkGroup;
        setNetworkGroups((current) => [...current, nextNetworkGroup]);
        effectiveFormState = {
          ...formState,
          networkGroupId: nextNetworkGroup.id,
        };
      }

      const preparedPayload = buildVmPayload(effectiveFormState);

      let response;
      if (formMode === 'clone') {
        response = await cloneVm(apiBase, cloneSourceVmName, preparedPayload);
      } else {
        response = mode === 'create'
          ? await createVm(apiBase, preparedPayload)
          : await saveVmConfig(apiBase, preparedPayload);
      }

      const nextVmName = response.vmName || preparedPayload.config.vm.name;
      setCreateDialogOpen(false);
      setFormMode('create');
      setCloneSourceVmName('');
      setFormState(createMetadataAwareFormState());
      showMessage(
        formMode === 'clone'
          ? `Cloned ${cloneSourceVmName} to ${nextVmName}.`
          : mode === 'create'
            ? `Provisioned ${nextVmName}.`
            : `Saved config for ${nextVmName}.`,
        'success',
      );
      await refreshInventory(nextVmName);
      await loadVmDetails(nextVmName);
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setSubmitState('idle');
    }
  }

  /**
   * Destroy the selected VM through the API.
   *
   * @returns {Promise<void>} Resolves after the destroy request and refresh complete.
   */
  async function handleDestroyVm() {
    if (!selectedVmName) {
      return;
    }

    const confirmed = window.confirm(
      `Destroy ${selectedVmName}? The saved config in the provisioner configs directory will be kept.`,
    );
    if (!confirmed) {
      return;
    }

    setVmActionState('destroy');
    try {
      await destroyVm(apiBase, selectedVmName);
      setStreamEnabled(false);
      setStreamLog('');
      showMessage(`Destroyed ${selectedVmName}.`, 'success');
      await refreshInventory(selectedVmName);
      await loadVmDetails(selectedVmName);
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setVmActionState('idle');
    }
  }

  /**
   * Provision the selected saved config into a live VM.
   *
   * @returns {Promise<void>} Resolves after provisioning and refresh complete.
   */
  async function handleProvisionStoredConfig() {
    if (!selectedVmName || !selectedVm?.configured) {
      showMessage('No saved config is available to provision.', 'warning');
      return;
    }

    setVmActionState('provision');
    try {
      await provisionSavedVm(apiBase, selectedVmName);
      showMessage(`Provisioned ${selectedVmName} from its saved config.`, 'success');
      await refreshInventory(selectedVmName);
      await loadVmDetails(selectedVmName);
      await loadSnapshot(selectedVmName);
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setVmActionState('idle');
    }
  }

  /**
   * Open the clone-config dialog with a suggested unique VM name.
   *
   * @returns {void}
   */
  function openCloneDialog() {
    if (!selectedVmName || !clonableConfig) {
      showMessage('No config is available to clone for this entry.', 'warning');
      return;
    }

    if (!selectedVm?.exists) {
      showMessage('Full VM clones require a live source VM disk.', 'warning');
      return;
    }

    const suggestedCloneName = buildUniqueCloneName(selectedVmName, knownVmNames);
    setFormMode('clone');
    setCloneSourceVmName(selectedVmName);
    setFormState((current) => ({
      ...createMetadataAwareFormState(),
      ...buildCloneFormState(clonableConfig, suggestedCloneName),
      ownerUserId: clonableConfig?.vm?.owner_user_id || current.ownerUserId || users[0]?.id || '',
      networkGroupId: clonableConfig?.vm?.network_group_id || '',
    }));
    setCreateDialogOpen(true);
  }

  /**
   * Open the create dialog with a fresh blank form.
   *
   * @returns {void}
   */
  function openCreateDialog() {
    setFormMode('create');
    setCloneSourceVmName('');
    setFormState(createMetadataAwareFormState());
    setCreateDialogOpen(true);
  }

  /**
   * Start the selected VM.
   *
   * @returns {Promise<void>} Resolves after the power action and refresh complete.
   */
  async function handleStartVm() {
    if (!selectedVmName) {
      return;
    }

    setVmActionState('start');
    try {
      await startVm(apiBase, selectedVmName);
      showMessage(`Started ${selectedVmName}.`, 'success');
      await refreshInventory(selectedVmName);
      await loadVmDetails(selectedVmName);
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setVmActionState('idle');
    }
  }

  /**
   * Stop the selected VM.
   *
   * @returns {Promise<void>} Resolves after the power action and refresh complete.
   */
  async function handleStopVm() {
    if (!selectedVmName) {
      return;
    }

    setVmActionState('stop');
    try {
      await stopVm(apiBase, selectedVmName);
      showMessage(`Stopped ${selectedVmName}.`, 'success');
      await refreshInventory(selectedVmName);
      await loadVmDetails(selectedVmName);
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setVmActionState('idle');
    }
  }

  /**
   * Update one or more saved per-VM network policy flags.
   *
   * @param {object} patch - Partial policy update.
   * @returns {Promise<void>} Resolves after the API save and refresh complete.
   */
  async function handleUpdateVmPolicy(patch) {
    if (!selectedVmName) {
      return;
    }

    setVmActionState('policy');
    try {
      await updateVmPolicy(apiBase, selectedVmName, patch);
      showMessage(`Updated network policy for ${selectedVmName}.`, 'success');
      await refreshInventory(selectedVmName);
      await loadVmDetails(selectedVmName);
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setVmActionState('idle');
    }
  }

  /**
   * Create a snapshot for the selected VM.
   *
   * @returns {Promise<void>} Resolves after snapshot creation and refresh complete.
   */
  async function handleCreateRestorePoint() {
    if (!selectedVmName) {
      return;
    }

    setVmActionState('snapshot-create');
    try {
      await createVmSnapshot(apiBase, selectedVmName);
      showMessage(`Created a snapshot for ${selectedVmName}.`, 'success');
      await refreshInventory(selectedVmName);
      await loadVmDetails(selectedVmName);
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setVmActionState('idle');
    }
  }

  /**
   * Restore the selected VM from a snapshot.
   *
   * @param {string} snapshotId - Snapshot identifier.
   * @returns {Promise<void>} Resolves after restore and refresh complete.
   */
  async function handleRestoreSnapshot(snapshotId) {
    if (!selectedVmName || !snapshotId) {
      return;
    }

    const confirmed = window.confirm(
      `Restore ${selectedVmName} from snapshot ${snapshotId}? The VM will be stopped and left powered off after the restore.`,
    );
    if (!confirmed) {
      return;
    }

    setVmActionState(`snapshot-restore:${snapshotId}`);
    try {
      await restoreVmSnapshot(apiBase, selectedVmName, snapshotId);
      showMessage(`Restored ${selectedVmName} from snapshot ${snapshotId}.`, 'success');
      await refreshInventory(selectedVmName);
      await loadVmDetails(selectedVmName);
      await loadSnapshot(selectedVmName);
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setVmActionState('idle');
    }
  }

  /**
   * Delete a snapshot.
   *
   * @param {string} snapshotId - Snapshot identifier.
   * @returns {Promise<void>} Resolves after deletion and refresh complete.
   */
  async function handleDeleteRestorePoint(snapshotId) {
    if (!selectedVmName || !snapshotId) {
      return;
    }

    const confirmed = window.confirm(`Delete snapshot ${snapshotId} for ${selectedVmName}?`);
    if (!confirmed) {
      return;
    }

    setVmActionState(`snapshot-delete:${snapshotId}`);
    try {
      await deleteVmSnapshot(apiBase, selectedVmName, snapshotId);
      showMessage(`Deleted snapshot ${snapshotId}.`, 'success');
      await refreshInventory(selectedVmName);
      await loadVmDetails(selectedVmName);
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setVmActionState('idle');
    }
  }

  useEffect(() => {
    void refreshInventory();
  }, [apiBase]);

  useEffect(() => {
    if (!createDialogOpen) {
      return;
    }

    if (!formState.ownerUserId && users.length > 0) {
      const nextOwnerUserId = users[0].id;
      const nextNetworkGroupId = networkGroups.find((group) => group.owner_user_id === nextOwnerUserId)?.id || '';
      setFormState((current) => ({
        ...current,
        ownerUserId: nextOwnerUserId,
        networkGroupId: current.networkGroupId || nextNetworkGroupId,
      }));
      return;
    }

    if (
      formState.ownerUserId
      && formState.networkGroupId !== '__new__'
      && !ownerScopedNetworkGroups.some((group) => group.id === formState.networkGroupId)
    ) {
      setFormState((current) => ({
        ...current,
        networkGroupId: ownerScopedNetworkGroups[0]?.id || '',
      }));
    }
  }, [createDialogOpen, formState.ownerUserId, formState.networkGroupId, networkGroups, ownerScopedNetworkGroups, users]);

  useEffect(() => {
    setDetailTab(0);
    setStreamEnabled(false);
    setStreamConnected(false);
    setStreamLog('');
    setStreamError('');

    if (!selectedVmName) {
      setSelectedVm(null);
      setSnapshotLog('');
      return;
    }

    void loadVmDetails(selectedVmName);
    void loadSnapshot(selectedVmName);
  }, [apiBase, selectedVmName]);

  useEffect(() => {
    if (!selectedVmName || !streamEnabled) {
      return undefined;
    }

    let stream;
    try {
      const lines = parseLineCount(streamLines, 100);
      setStreamConnected(false);
      setStreamError('');
      setStreamLog('');

      stream = new EventSource(buildVmLogStreamUrl(apiBase, selectedVmName, lines));
      stream.onopen = () => {
        setStreamConnected(true);
      };
      stream.addEventListener('log', (event) => {
        try {
          const payload = JSON.parse(event.data);
          setStreamLog((current) => `${current}${payload.chunk || ''}`);
        } catch {
          setStreamLog((current) => `${current}${event.data}\n`);
        }
      });
      stream.addEventListener('error', (event) => {
        if (typeof event.data === 'string' && event.data) {
          try {
            const payload = JSON.parse(event.data);
            setStreamError(payload.message || 'Log stream reported an error.');
          } catch {
            setStreamError(event.data);
          }
        } else {
          setStreamError('Log stream disconnected.');
        }
        setStreamConnected(false);
      });
    } catch (error) {
      setStreamEnabled(false);
      setStreamError(error.message);
      showMessage(error.message, 'warning');
      return undefined;
    }

    return () => {
      stream?.close();
      setStreamConnected(false);
    };
  }, [apiBase, selectedVmName, streamEnabled, streamLines]);

  const selectedStatus = buildStatusDescriptor(selectedVm);

  return (
    <Box sx={{ minHeight: '100vh', py: { xs: 3, md: 5 } }}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <Paper sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Stack spacing={3}>
              <Stack
                direction={{ xs: 'column', lg: 'row' }}
                justifyContent="space-between"
                spacing={2.5}
              >
                <Box sx={{ maxWidth: 760 }}>
                  <Typography variant="overline" color="primary.main" sx={{ letterSpacing: '0.18em' }}>
                    HOMELAB VM CONTROL SURFACE
                  </Typography>
                  <Typography variant="h3" sx={{ mt: 1.2 }}>
                    An elegant dark console for provisioning and operating VMs.
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5, maxWidth: 640 }}>
                    Create or save machine configs, inspect provisioner state, follow libvirt logs live,
                    and tear down VMs without leaving the browser.
                  </Typography>
                </Box>

                <Stack spacing={1.5} sx={{ minWidth: { lg: 380 } }}>
                  <TextField
                    label="API base URL"
                    size="small"
                    value={apiBaseInput}
                    onChange={(event) => setApiBaseInput(event.target.value)}
                    helperText="Leave blank to use the Vite dev proxy to http://localhost:3000."
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems="stretch">
                    <Button
                      variant="contained"
                      startIcon={<CloudDoneRoundedIcon />}
                      onClick={() => {
                        const nextBase = apiBaseInput.trim();
                        if (nextBase === apiBase) {
                          void refreshInventory();
                          return;
                        }
                        setApiBase(nextBase);
                      }}
                    >
                      Connect
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<RefreshRoundedIcon />}
                      onClick={() => void refreshInventory()}
                    >
                      Refresh Inventory
                    </Button>
                    <Button
                      variant="outlined"
                      color="secondary"
                      startIcon={<AddRoundedIcon />}
                      onClick={openCreateDialog}
                    >
                      New VM
                    </Button>
                  </Stack>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      icon={<CloudDoneRoundedIcon />}
                      label={health.message}
                      color={health.state === 'ok' ? 'success' : health.state === 'error' ? 'error' : 'default'}
                      variant={health.state === 'checking' ? 'outlined' : 'filled'}
                    />
                    <Chip
                      label={apiBase.trim() || 'Using same-origin proxy'}
                      variant="outlined"
                    />
                  </Stack>
                </Stack>
              </Stack>

              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' },
                }}
              >
                <MetricCard
                  title="Total inventory"
                  value={vms.length}
                  caption="Merged view of saved configs and provisioner-visible machines."
                  icon={<DnsRoundedIcon />}
                />
                <MetricCard
                  title="Running VMs"
                  value={runningCount}
                  caption="Machines the API currently sees in a running state."
                  icon={<RocketLaunchRoundedIcon />}
                />
                <MetricCard
                  title="Saved definitions"
                  value={configuredCount}
                  caption="VM configs retained for later reprovisioning or review."
                  icon={<SaveRoundedIcon />}
                />
                <MetricCard
                  title="Attention needed"
                  value={issueCount}
                  caption="Configs or machines with missing state, errors, or no live presence."
                  icon={<TerminalRoundedIcon />}
                />
              </Box>
            </Stack>
          </Paper>

          <Box
            sx={{
              display: 'grid',
              gap: 3,
              alignItems: 'start',
              gridTemplateColumns: { xs: '1fr', xl: '360px minmax(0, 1fr)' },
            }}
          >
            <Paper sx={{ p: 2.5 }}>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h6">VM inventory</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Search by name, status, address, trust, network group, or network profile.
                    </Typography>
                  </Box>
                  {inventoryLoading ? <CircularProgress size={20} /> : null}
                </Stack>

                <TextField
                  size="small"
                  placeholder="Search machines"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />

                <List sx={{ p: 0 }}>
                  {filteredVms.map((vm) => {
                    const status = buildStatusDescriptor(vm);
                    return (
                      <ListItemButton
                        key={vm.name}
                        selected={vm.name === selectedVmName}
                        onClick={() => {
                          startTransition(() => {
                            setSelectedVmName(vm.name);
                          });
                        }}
                        sx={{
                          mb: 1.25,
                          borderRadius: 2.5,
                          alignItems: 'flex-start',
                          border: (theme) => `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                        }}
                      >
                        <ListItemText
                          disableTypography
                          primary={
                            <Stack
                              direction="row"
                              alignItems="center"
                              justifyContent="space-between"
                              spacing={1}
                            >
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {vm.name}
                              </Typography>
                              <Chip size="small" label={status.label} color={status.color} />
                            </Stack>
                          }
                          secondary={
                            <Stack spacing={0.75} sx={{ mt: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                {formatNetworkSummary(vm)}
                              </Typography>
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                {vm.trust ? <Chip size="small" variant="outlined" label={vm.trust} /> : null}
                                {vm.configured ? (
                                  <Chip size="small" variant="outlined" color="secondary" label="Config saved" />
                                ) : null}
                              </Stack>
                            </Stack>
                          }
                        />
                      </ListItemButton>
                    );
                  })}
                </List>

                {!inventoryLoading && filteredVms.length === 0 ? (
                  <Alert severity="info">
                    No matching VMs yet. Create a new definition or broaden your search.
                  </Alert>
                ) : null}
              </Stack>
            </Paper>

            <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
              {!selectedVmName ? (
                <Stack spacing={2} alignItems="flex-start">
                  <Typography variant="h5">No VM selected</Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560 }}>
                    Create your first machine definition or select an existing item from the inventory to
                    inspect its live status, config, and logs.
                  </Typography>
                  <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateDialog}>
                    Create VM Definition
                  </Button>
                </Stack>
              ) : (
                <Stack spacing={3}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                    <Box>
                      <Stack direction="row" spacing={1.2} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography variant="h4">{selectedVmName}</Typography>
                        <Chip color={selectedStatus.color} label={selectedStatus.label} />
                        {selectedVm?.configured ? (
                          <Chip variant="outlined" color="secondary" label="Config persisted" />
                        ) : null}
                        {selectedVmNetworkGroup ? (
                          <Chip variant="outlined" label={selectedVmNetworkGroup.name} />
                        ) : null}
                      </Stack>
                      <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                        {selectedVm?.ip_address || 'No live IP reported'} •{' '}
                        {selectedVm?.network?.profile || selectedVm?.network?.mode || 'No network profile reported'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                        Owner: {selectedVmOwner?.username || selectedVm?.owner_user_id || 'unknown'} • MAC:{' '}
                        {selectedVm?.mac_address || selectedVm?.network?.mac || 'Unavailable'}
                      </Typography>
                    </Box>
                    <Stack spacing={1.25} alignItems={{ xs: 'stretch', md: 'flex-end' }}>
                      <Box
                        sx={{
                          px: 1.5,
                          py: 1.25,
                          borderRadius: 2.5,
                          border: (theme) => `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                          backgroundColor: (theme) => alpha(theme.palette.common.white, 0.03),
                        }}
                      >
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1.25}
                          justifyContent="space-between"
                          alignItems={{ xs: 'stretch', sm: 'center' }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography variant="body2" color="text.secondary">
                              Power controls
                            </Typography>
                            <Chip size="small" color={powerStateColor} label={powerStateLabel} />
                          </Stack>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Button
                              variant="contained"
                              startIcon={<PlayArrowRoundedIcon />}
                              disabled={vmActionState !== 'idle' || !canStartSelectedVm}
                              onClick={() => void handleStartVm()}
                            >
                              {vmActionState === 'start' ? 'Starting…' : 'Start'}
                            </Button>
                            <Button
                              variant="outlined"
                              color="warning"
                              startIcon={<StopRoundedIcon />}
                              disabled={vmActionState !== 'idle' || !canStopSelectedVm}
                              onClick={() => void handleStopVm()}
                            >
                              {vmActionState === 'stop' ? 'Stopping…' : 'Stop'}
                            </Button>
                          </Stack>
                        </Stack>
                      </Box>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {hasClonableConfig ? (
                          <Tooltip
                            title={
                              canCloneVm
                                ? 'Create a full VM clone from the source disk.'
                                : 'Full VM clones require a live source VM disk.'
                            }
                          >
                            <span>
                              <Button
                                variant="outlined"
                                color="secondary"
                                startIcon={<ContentCopyRoundedIcon />}
                                disabled={vmActionState !== 'idle' || !canCloneVm}
                                onClick={openCloneDialog}
                              >
                                Full Clone
                              </Button>
                            </span>
                          </Tooltip>
                        ) : null}
                        <Tooltip
                          title={
                            canCreateSnapshot
                              ? 'Capture a reusable VM snapshot.'
                              : 'Snapshots require a provisioned VM disk.'
                          }
                        >
                          <span>
                            <Button
                              variant="outlined"
                              startIcon={<BackupRoundedIcon />}
                              disabled={vmActionState !== 'idle' || !canCreateSnapshot}
                              onClick={() => void handleCreateRestorePoint()}
                            >
                              {vmActionState === 'snapshot-create' ? 'Saving…' : 'Create Snapshot'}
                            </Button>
                          </span>
                        </Tooltip>
                        {canProvisionStoredConfig ? (
                          <Button
                            variant="contained"
                            color="secondary"
                            startIcon={<RocketLaunchRoundedIcon />}
                            disabled={vmActionState !== 'idle'}
                            onClick={() => void handleProvisionStoredConfig()}
                          >
                            {vmActionState === 'provision' ? 'Provisioning…' : 'Provision saved config'}
                          </Button>
                        ) : null}
                        <Button
                          variant="outlined"
                          startIcon={<RefreshRoundedIcon />}
                          disabled={vmActionState !== 'idle'}
                          onClick={async () => {
                            await refreshInventory(selectedVmName);
                            await loadVmDetails(selectedVmName);
                            await loadSnapshot(selectedVmName);
                          }}
                        >
                          Refresh
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteOutlineRoundedIcon />}
                          disabled={vmActionState !== 'idle' || !selectedVm?.exists}
                          onClick={() => void handleDestroyVm()}
                        >
                          {vmActionState === 'destroy' ? 'Destroying…' : 'Destroy VM'}
                        </Button>
                      </Stack>
                    </Stack>
                  </Stack>

                  {detailLoading ? (
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <CircularProgress size={20} />
                      <Typography color="text.secondary">Refreshing VM details…</Typography>
                    </Stack>
                  ) : null}

                  {selectedVm?.provisionerError ? (
                    <Alert severity="warning">{selectedVm.provisionerError}</Alert>
                  ) : null}

                  {canProvisionStoredConfig ? (
                    <Alert
                      severity="info"
                      action={
                        <Button
                          color="inherit"
                          size="small"
                          disabled={vmActionState !== 'idle'}
                          onClick={() => void handleProvisionStoredConfig()}
                        >
                          {vmActionState === 'provision' ? 'Provisioning…' : 'Create VM'}
                        </Button>
                      }
                    >
                      This entry has a saved config but no live VM. Use the saved definition to provision it now.
                    </Alert>
                  ) : null}

                  <Box
                    sx={{
                      display: 'grid',
                      gap: 2,
                      gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                    }}
                  >
                    <MetricCard
                      title="Provisioner status"
                      value={selectedVm?.status || 'unknown'}
                      caption={selectedVm?.state_path || 'No persisted state file detected.'}
                      icon={<HubRoundedIcon />}
                    />
                    <MetricCard
                      title="Primary address"
                      value={selectedVm?.ip_address || 'Unavailable'}
                      caption={selectedVm?.ip_source ? `Resolved via ${selectedVm.ip_source}.` : 'No IP source reported.'}
                      icon={<DnsRoundedIcon />}
                    />
                  </Box>

                  <Tabs value={detailTab} onChange={(_event, nextValue) => setDetailTab(nextValue)}>
                    <Tab label="Overview" />
                    <Tab label="Config" />
                    <Tab label={snapshots.length > 0 ? `Snapshots (${snapshots.length})` : 'Snapshots'} />
                    <Tab label="Logs" />
                  </Tabs>

                  {detailTab === 0 ? (
                    <Box
                      sx={{
                        display: 'grid',
                        gap: 2,
                        gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
                      }}
                    >
                      <Paper sx={{ p: 2.5 }}>
                        <Stack spacing={1.5}>
                          <Typography variant="h6">Runtime overview</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Trust: {selectedVm?.trust || 'not set'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Admin key: {selectedVm?.admin_private_key || 'Unavailable'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            VM data dir: {selectedVm?.vm_data_dir || 'Unavailable'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Stored config path: {selectedVm?.storedConfigPath || 'None'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Log path: {selectedVm?.log_path || 'Unavailable'}
                          </Typography>
                        </Stack>
                      </Paper>
                      <Paper sx={{ p: 2.5 }}>
                        <Stack spacing={1.5}>
                          <Typography variant="h6">Network + ports</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Network group: {selectedVmNetworkGroup?.name || selectedVm?.network?.group_name || selectedVm?.network_group_id || 'Unavailable'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Subnet: {selectedVm?.network?.subnet_cidr || selectedVm?.network?.cidr || 'Unavailable'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Network: {selectedVm?.network?.name || 'Unavailable'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            CIDR: {selectedVm?.network?.cidr || 'Unavailable'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            VM IP: {selectedVm?.network?.vm_ip || selectedVm?.ip_address || 'Unavailable'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            MAC: {selectedVm?.network?.mac || 'Unavailable'}
                          </Typography>
                          <Box component="pre" sx={{ p: 1.75, borderRadius: 2, backgroundColor: (theme) => alpha(theme.palette.common.black, 0.24) }}>
                            {selectedVm?.ports?.length
                              ? formatJson(selectedVm.ports)
                              : 'No forwarded ports configured.'}
                          </Box>
                        </Stack>
                      </Paper>
                      <Paper sx={{ p: 2.5 }}>
                        <Stack spacing={1.5}>
                          <Typography variant="h6">Group Isolation</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Owner: {selectedVmOwner?.username || selectedVm?.owner_user_id || 'unknown'}
                          </Typography>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={selectedVm?.allow_same_group_traffic !== false}
                                disabled={vmActionState !== 'idle'}
                                onChange={(event) =>
                                  void handleUpdateVmPolicy({
                                    allow_same_group_traffic: event.target.checked,
                                  })
                                }
                              />
                            }
                            label="Allow same network-group traffic"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={selectedVm?.internet_access !== false}
                                disabled={vmActionState !== 'idle'}
                                onChange={(event) =>
                                  void handleUpdateVmPolicy({
                                    internet_access: event.target.checked,
                                  })
                                }
                              />
                            }
                            label="Allow internet access"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={selectedVm?.allow_host_access !== false}
                                disabled={vmActionState !== 'idle'}
                                onChange={(event) =>
                                  void handleUpdateVmPolicy({
                                    allow_host_access: event.target.checked,
                                  })
                                }
                              />
                            }
                            label="Allow hypervisor host access"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={Boolean(selectedVm?.allow_private_lan_access)}
                                disabled={
                                  vmActionState !== 'idle'
                                  || (selectedVmOwner?.role || '') !== 'admin'
                                }
                                onChange={(event) =>
                                  void handleUpdateVmPolicy({
                                    allow_private_lan_access: event.target.checked,
                                  })
                                }
                              />
                            }
                            label="Allow private LAN access"
                          />
                        </Stack>
                      </Paper>
                      <JsonPanel
                        title="Libvirt domain info"
                        subtitle="Raw dominfo fields as returned by the Python bridge."
                        value={formatJson(selectedVm?.dominfo || {})}
                      />
                      <JsonPanel
                        title="Discovered network object"
                        subtitle="The merged network payload returned for this VM."
                        value={formatJson(selectedVm?.network || {})}
                      />
                    </Box>
                  ) : null}

                  {detailTab === 1 ? (
                    <Box
                      sx={{
                        display: 'grid',
                        gap: 2,
                        gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
                      }}
                    >
                      <JsonPanel
                        title="API-stored config"
                        subtitle={selectedVm?.storedConfigPath || 'No stored config path recorded.'}
                        value={formatJson(selectedVm?.storedConfig || {})}
                      />
                      <JsonPanel
                        title="Provisioner config snapshot"
                        subtitle={selectedVm?.config_path || 'No provisioner config path recorded.'}
                        value={formatJson(selectedVm?.config || {})}
                      />
                    </Box>
                  ) : null}

                  {detailTab === 2 ? (
                    <Stack spacing={2}>
                      <Paper sx={{ p: 2.5 }}>
                        <Stack spacing={2}>
                          <Stack
                            direction={{ xs: 'column', md: 'row' }}
                            justifyContent="space-between"
                            alignItems={{ xs: 'stretch', md: 'center' }}
                            spacing={2}
                          >
                            <Box>
                              <Typography variant="h6">Snapshots</Typography>
                              <Typography variant="body2" color="text.secondary">
                                Snapshots capture the VM disk plus saved config-side assets so you can restore the machine to a known host state.
                              </Typography>
                            </Box>
                            <Tooltip
                              title={
                                canCreateSnapshot
                                  ? 'Capture a reusable VM snapshot.'
                                  : 'Snapshots require a provisioned VM disk.'
                              }
                            >
                              <span>
                                <Button
                                  variant="outlined"
                                  startIcon={<BackupRoundedIcon />}
                                  disabled={vmActionState !== 'idle' || !canCreateSnapshot}
                                  onClick={() => void handleCreateRestorePoint()}
                                >
                                  {vmActionState === 'snapshot-create' ? 'Saving…' : 'Create Snapshot'}
                                </Button>
                              </span>
                            </Tooltip>
                          </Stack>
                          {!selectedVm?.exists ? (
                            <Alert severity="info">
                              Provision this VM before taking a snapshot. Any existing snapshots for this VM will still appear here.
                            </Alert>
                          ) : null}
                          {snapshots.length === 0 ? (
                            <Alert severity="info">No snapshots have been created for this VM yet.</Alert>
                          ) : (
                            <List sx={{ p: 0 }}>
                              {snapshots.map((snapshot) => (
                                <ListItemButton
                                  key={snapshot.snapshot_id}
                                  disableRipple
                                  sx={{
                                    mb: 1,
                                    borderRadius: 2,
                                    border: (theme) => `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                                    alignItems: 'stretch',
                                  }}
                                >
                                  <Stack
                                    direction={{ xs: 'column', md: 'row' }}
                                    justifyContent="space-between"
                                    spacing={2}
                                    sx={{ width: '100%' }}
                                  >
                                    <ListItemText
                                      primary={snapshot.snapshot_id}
                                      secondary={snapshot.created_at || 'Creation time unavailable'}
                                    />
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<RestoreRoundedIcon />}
                                        disabled={vmActionState !== 'idle'}
                                        onClick={() => void handleRestoreSnapshot(snapshot.snapshot_id)}
                                      >
                                        Restore
                                      </Button>
                                      <Button
                                        size="small"
                                        color="error"
                                        variant="outlined"
                                        startIcon={<DeleteOutlineRoundedIcon />}
                                        disabled={vmActionState !== 'idle'}
                                        onClick={() => void handleDeleteRestorePoint(snapshot.snapshot_id)}
                                      >
                                        Delete
                                      </Button>
                                    </Stack>
                                  </Stack>
                                </ListItemButton>
                              ))}
                            </List>
                          )}
                        </Stack>
                      </Paper>
                    </Stack>
                  ) : null}

                  {detailTab === 3 ? (
                    <Stack spacing={2}>
                      <Paper sx={{ p: 2.5 }}>
                        <Stack spacing={2}>
                          <Stack
                            direction={{ xs: 'column', md: 'row' }}
                            justifyContent="space-between"
                            alignItems={{ xs: 'stretch', md: 'center' }}
                            spacing={2}
                          >
                            <Box>
                              <Typography variant="h6">Log snapshot</Typography>
                              <Typography variant="body2" color="text.secondary">
                                Pull the latest lines from `/var/log/libvirt/qemu/{selectedVmName}.log`.
                              </Typography>
                            </Box>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                              <TextField
                                size="small"
                                label="Lines"
                                value={snapshotLines}
                                onChange={(event) => setSnapshotLines(event.target.value)}
                                sx={{ minWidth: 120 }}
                              />
                              <Button
                                variant="outlined"
                                startIcon={<RefreshRoundedIcon />}
                                onClick={() => void loadSnapshot(selectedVmName)}
                              >
                                Reload snapshot
                              </Button>
                            </Stack>
                          </Stack>
                          <Box
                            component="pre"
                            sx={{
                              minHeight: 220,
                              maxHeight: 360,
                              overflow: 'auto',
                              borderRadius: 2,
                              p: 2,
                              backgroundColor: (theme) => alpha(theme.palette.common.black, 0.28),
                            }}
                          >
                            {snapshotLoading
                              ? 'Loading snapshot…'
                              : snapshotLog || 'No log output loaded yet.'}
                          </Box>
                        </Stack>
                      </Paper>

                      <Paper sx={{ p: 2.5 }}>
                        <Stack spacing={2}>
                          <Stack
                            direction={{ xs: 'column', md: 'row' }}
                            justifyContent="space-between"
                            alignItems={{ xs: 'stretch', md: 'center' }}
                            spacing={2}
                          >
                            <Box>
                              <Typography variant="h6">Live stream</Typography>
                              <Typography variant="body2" color="text.secondary">
                                Stream log chunks continuously over Server-Sent Events while the connection stays open.
                              </Typography>
                            </Box>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems="center">
                              <TextField
                                size="small"
                                label="Initial lines"
                                value={streamLines}
                                onChange={(event) => setStreamLines(event.target.value)}
                                sx={{ minWidth: 140 }}
                              />
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={streamEnabled}
                                    onChange={(event) => setStreamEnabled(event.target.checked)}
                                  />
                                }
                                label={streamEnabled ? 'Streaming' : 'Stopped'}
                              />
                              <Chip
                                label={streamConnected ? 'Connected' : 'Disconnected'}
                                color={streamConnected ? 'success' : 'default'}
                              />
                            </Stack>
                          </Stack>
                          {streamError ? <Alert severity="warning">{streamError}</Alert> : null}
                          <Box
                            component="pre"
                            sx={{
                              minHeight: 220,
                              maxHeight: 420,
                              overflow: 'auto',
                              borderRadius: 2,
                              p: 2,
                              backgroundColor: (theme) => alpha(theme.palette.common.black, 0.28),
                            }}
                          >
                            {streamLog || 'Enable streaming to follow new log output in real time.'}
                          </Box>
                        </Stack>
                      </Paper>
                    </Stack>
                  ) : null}
                </Stack>
              )}
            </Paper>
          </Box>
        </Stack>
      </Container>

      <Dialog
        open={createDialogOpen}
        onClose={() => {
          if (submitState === 'idle') {
            setCreateDialogOpen(false);
            setFormMode('create');
            setCloneSourceVmName('');
            setFormState(createMetadataAwareFormState());
          }
        }}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>{formMode === 'clone' ? 'Create a Full VM Clone' : 'Create or save a VM definition'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ pt: 1 }}>
            {formMode === 'clone' ? (
              <Alert severity="info">
                This creates a full VM clone from <strong>{cloneSourceVmName}</strong>. A unique target name is prefilled, and the forwarded-port plus tenant SSH key inputs were cleared so the clone does not silently reuse the source runtime identity.
              </Alert>
            ) : null}
            {formMode === 'clone' ? (
              <Alert severity="warning">
                Review the target name, networking, host port forwards, and tenant access settings before submitting the clone.
              </Alert>
            ) : null}
            {formMode === 'clone' ? (
              <TextField
                label="Source VM"
                value={cloneSourceVmName}
                InputProps={{ readOnly: true }}
              />
            ) : null}
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              }}
            >
              <TextField
                select
                label="Owner"
                value={formState.ownerUserId}
                onChange={(event) => {
                  const nextOwnerUserId = event.target.value;
                  const nextNetworkGroupId = networkGroups.find(
                    (group) => group.owner_user_id === nextOwnerUserId,
                  )?.id || '';
                  setFormState((current) => ({
                    ...current,
                    ownerUserId: nextOwnerUserId,
                    networkGroupId: nextNetworkGroupId,
                    newNetworkGroupName: '',
                  }));
                }}
              >
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.username} ({user.role})
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Network group"
                value={formState.networkGroupId}
                onChange={(event) => setFormState((current) => ({ ...current, networkGroupId: event.target.value }))}
                helperText="One libvirt network is shared by all VMs in the same group."
              >
                {ownerScopedNetworkGroups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name} ({group.profile})
                  </MenuItem>
                ))}
                <MenuItem value="__new__">Create a new network group</MenuItem>
              </TextField>
              {formState.networkGroupId === '__new__' ? (
                <TextField
                  label="New network group name"
                  value={formState.newNetworkGroupName}
                  onChange={(event) => setFormState((current) => ({
                    ...current,
                    newNetworkGroupName: event.target.value,
                  }))}
                />
              ) : (
                <TextField
                  label="Assigned group subnet"
                  value={ownerScopedNetworkGroups.find((group) => group.id === formState.networkGroupId)?.subnet_cidr || 'Assigned by API'}
                  InputProps={{ readOnly: true }}
                />
              )}
              {formState.networkGroupId === '__new__' ? (
                <TextField
                  select
                  label="New group profile"
                  value={formState.newNetworkGroupProfile}
                  onChange={(event) => setFormState((current) => ({
                    ...current,
                    newNetworkGroupProfile: event.target.value,
                  }))}
                  helperText="`isolated_nat` is the recommended default for tenant isolation."
                >
                  <MenuItem value="private">private</MenuItem>
                  <MenuItem value="nat">nat</MenuItem>
                  <MenuItem value="isolated_nat">isolated_nat</MenuItem>
                  <MenuItem value="bridged">bridged</MenuItem>
                </TextField>
              ) : null}
              <TextField
                autoFocus={formMode === 'clone'}
                label={formMode === 'clone' ? 'Target VM name' : 'VM name'}
                value={formState.name}
                onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                inputProps={{ maxLength: MAX_VM_NAME_LENGTH }}
                error={Boolean(normalizedDraftVmName && knownVmNames.has(normalizedDraftVmName))}
                helperText={
                  normalizedDraftVmName && knownVmNames.has(normalizedDraftVmName)
                    ? 'VM name must be unique.'
                    : formMode === 'clone'
                      ? `Choose a unique name for the cloned VM. ${MAX_VM_NAME_LENGTH} characters max.`
                      : `${MAX_VM_NAME_LENGTH} characters max.`
                }
              />
              <TextField
                label="Tenant user"
                value={formState.user}
                onChange={(event) => setFormState((current) => ({ ...current, user: event.target.value }))}
              />
              <TextField
                select
                label="Trust"
                value={formState.trust}
                onChange={(event) => setFormState((current) => ({ ...current, trust: event.target.value }))}
              >
                <MenuItem value="untrusted">untrusted</MenuItem>
                <MenuItem value="trusted">trusted</MenuItem>
              </TextField>
              <TextField
                type="number"
                label="RAM (MB)"
                value={formState.ramMb}
                onChange={(event) => setFormState((current) => ({ ...current, ramMb: event.target.value }))}
              />
              <TextField
                type="number"
                label="vCPUs"
                value={formState.vcpus}
                onChange={(event) => setFormState((current) => ({ ...current, vcpus: event.target.value }))}
              />
              <TextField
                type="number"
                label="Disk (GB)"
                value={formState.diskGb}
                onChange={(event) => setFormState((current) => ({ ...current, diskGb: event.target.value }))}
              />
            </Box>

            <Box
              sx={{
                display: 'grid',
                gap: 1,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={formState.allowSudo}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, allowSudo: event.target.checked }))
                    }
                  />
                }
                label="Grant passwordless sudo to the tenant user"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formState.allowSameGroupTraffic}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, allowSameGroupTraffic: event.target.checked }))
                    }
                  />
                }
                label="Allow same-group VM traffic"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formState.internetAccess}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, internetAccess: event.target.checked }))
                    }
                  />
                }
                label="Allow internet access"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formState.allowHostAccess}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, allowHostAccess: event.target.checked }))
                    }
                  />
                }
                label="Allow host access"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formState.allowPrivateLanAccess}
                    disabled={(users.find((user) => user.id === formState.ownerUserId)?.role || '') !== 'admin'}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        allowPrivateLanAccess: event.target.checked,
                      }))
                    }
                  />
                }
                label="Allow private LAN access (admin only)"
              />
            </Box>

            <Divider />

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
              }}
            >
              <TextField
                multiline
                minRows={3}
                label="Packages"
                value={formState.packagesText}
                onChange={(event) => setFormState((current) => ({ ...current, packagesText: event.target.value }))}
                helperText="Comma-separated, for example: git, tmux, htop"
              />
              <TextField
                multiline
                minRows={3}
                label="DNS resolvers"
                value={formState.dnsResolversText}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, dnsResolversText: event.target.value }))
                }
                helperText="Comma-separated IP addresses. Leave blank to use provisioner defaults."
              />
              <TextField
                multiline
                minRows={4}
                label="Forwarded ports"
                value={formState.portsText}
                onChange={(event) => setFormState((current) => ({ ...current, portsText: event.target.value }))}
                helperText={
                  formMode === 'clone'
                    ? 'One per line. Review host ports before cloning to avoid collisions. Example: 2222:22/tcp'
                    : 'One per line. Example: 2222:22/tcp'
                }
              />
              <TextField
                multiline
                minRows={6}
                label="Tenant SSH public key"
                value={formState.sshPublicKey}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, sshPublicKey: event.target.value }))
                }
                helperText={
                  formMode === 'clone'
                    ? 'Optional. Provide a new tenant SSH key for the clone. When provided, the API stores the key under the provisioner user-keys directory and rewrites vm.ssh_key_file automatically.'
                    : 'When provided, the API stores the key under the provisioner user-keys directory and rewrites vm.ssh_key_file automatically.'
                }
              />
              <TextField
                multiline
                minRows={2}
                label="Existing absolute SSH key path"
                value={formState.sshKeyFile}
                onChange={(event) => setFormState((current) => ({ ...current, sshKeyFile: event.target.value }))}
                helperText={
                  formMode === 'clone'
                    ? 'Optional. Point the clone at a different tenant key path when you are not submitting sshPublicKey.'
                    : 'Use this only when you are not submitting sshPublicKey.'
                }
              />
              <TextField
                multiline
                minRows={6}
                label="Post-cloud-init setup script"
                value={formState.setupScript}
                onChange={(event) => setFormState((current) => ({ ...current, setupScript: event.target.value }))}
                helperText={
                  formMode === 'clone'
                    ? 'Optional. Review whether the source setup script still applies to the clone.'
                    : 'Optional shell script content to run after the built-in cloud-init commands finish.'
                }
              />
              <TextField
                multiline
                minRows={2}
                label="Existing absolute setup script path"
                value={formState.setupScriptFile}
                onChange={(event) => setFormState((current) => ({ ...current, setupScriptFile: event.target.value }))}
                helperText={
                  formMode === 'clone'
                    ? 'Optional. Review whether the source setup script path should be reused for the clone.'
                    : 'Use this only when you are not submitting setupScript content.'
                }
              />
            </Box>

            {draftPayloadError ? <Alert severity="warning">{draftPayloadError}</Alert> : null}

            <JsonPanel
              title="Request preview"
              subtitle="This is the JSON payload that will be sent to the API."
              value={draftPayload ? formatJson(draftPayload) : draftPayloadError || '{}'}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              if (submitState === 'idle') {
                setCreateDialogOpen(false);
                setFormMode('create');
                setCloneSourceVmName('');
                setFormState(createMetadataAwareFormState());
              }
            }}
          >
            Cancel
          </Button>
          {formMode === 'clone' ? (
            <Tooltip title="Save the cloned config and create a full VM clone from the source disk.">
              <span>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<ContentCopyRoundedIcon />}
                  disabled={submitState !== 'idle' || !draftPayload}
                  onClick={() => void handleFormSubmit('clone')}
                >
                  {submitState === 'clone' ? 'Cloning…' : 'Create Full Clone'}
                </Button>
              </span>
            </Tooltip>
          ) : (
            <>
              <Tooltip title="Persist the config without provisioning a VM.">
                <span>
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<SaveRoundedIcon />}
                    disabled={submitState !== 'idle' || !draftPayload}
                    onClick={() => void handleFormSubmit('config')}
                  >
                    {submitState === 'config' ? 'Saving…' : 'Save config'}
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Save the config and call the provisioner immediately.">
                <span>
                  <Button
                    variant="contained"
                    startIcon={<RocketLaunchRoundedIcon />}
                    disabled={submitState !== 'idle' || !draftPayload}
                    onClick={() => void handleFormSubmit('create')}
                  >
                    {submitState === 'create' ? 'Provisioning…' : 'Create VM'}
                  </Button>
                </span>
              </Tooltip>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
