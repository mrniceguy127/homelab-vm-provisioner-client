/**
 * Display formatting and status utilities.
 */

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

  // Destroyed VMs should not be shown
  if (vm.status === 'destroyed') {
    return { label: 'Destroyed', color: 'error' };
  }

  if (vm.exists && String(vm.status).toLowerCase() === 'running') {
    return { label: 'Running', color: 'success' };
  }

  if (vm.exists) {
    return { label: vm.status || 'Present', color: 'warning' };
  }

  if (vm.configured) {
    return { label: 'Template only', color: 'secondary' };
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
