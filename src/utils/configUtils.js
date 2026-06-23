/**
 * VM configuration building and transformation utilities.
 */

import { 
  parsePositiveInteger, 
  parseCommaSeparatedList, 
  parsePortRules,
  normalizeVmName,
  escapeRegExp,
  createDefaultFormState 
} from './formUtils.js';
import { 
  isValidHostname, 
  validateResourceLimits 
} from './validationUtils.js';

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
    const candidateName = `${normalizedSourceVmName}-${index}`;
    if (!existingNames.has(normalizeVmName(candidateName))) {
      return candidateName;
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
    throw new Error('Cannot clone: config.vm must be an object');
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

  if (clonedConfig.scripts?.setup_script_file) {
    const previousPattern = escapeRegExp(previousVmName);
    const regexp = new RegExp(previousPattern, 'g');
    clonedConfig.scripts.setup_script_file = clonedConfig.scripts.setup_script_file.replace(
      regexp,
      clonedConfig.vm.name
    );
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
 * @param {object} limits - Resource limits.
 * @returns {{config: object, sshPublicKey?: string, setupScript?: string}} Request payload.
 */
export function buildVmPayload(formState, limits = { maxRamMb: 8192, maxVcpus: 4, maxDiskGb: 20 }) {
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

  // Validate resource limits
  validateResourceLimits(vm.ram_mb, vm.vcpus, vm.disk_gb, limits);

  if (!vm.name) {
    throw new Error('VM name is required');
  }

  // Validate hostname format
  if (!isValidHostname(vm.name)) {
    throw new Error('VM name must be a valid hostname');
  }

  if (!vm.user) {
    throw new Error('User is required');
  }

  if (!vm.owner_user_id) {
    throw new Error('Owner user ID is required');
  }

  if (!vm.network_group_id) {
    throw new Error('Network group ID is required');
  }

  if (vm.network_group_id === '__new__' && !String(formState.newNetworkGroupName || '').trim()) {
    throw new Error('New network group name is required');
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
    if (!config.scripts) {
      config.scripts = {};
    }
    config.scripts.setup_script_file = formState.setupScriptFile.trim();
  }

  if (formState.setupScript.trim()) {
    payload.setupScript = formState.setupScript.trim();
  }

  return payload;
}
