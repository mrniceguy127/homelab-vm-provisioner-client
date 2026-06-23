/**
 * Validation utilities for VM configurations and user inputs.
 */

import { parseCommaSeparatedList, parsePortRules } from './formUtils.js';

/**
 * Validate an IPv4 address format.
 *
 * @param {string} ip - IP address to validate.
 * @returns {boolean} True if valid IPv4 address.
 */
export function isValidIPv4(ip) {
  if (!ip || typeof ip !== 'string') {
    return false;
  }
  const parts = ip.trim().split('.');
  if (parts.length !== 4) {
    return false;
  }
  return parts.every((part) => {
    const num = Number.parseInt(part, 10);
    return !Number.isNaN(num) && num >= 0 && num <= 255;
  });
}

/**
 * Validate DNS resolvers list.
 *
 * @param {string} text - Comma-separated DNS resolver IPs.
 * @throws {Error} If any resolver is invalid.
 */
export function validateDnsResolvers(text) {
  if (!text.trim()) {
    return;
  }
  const resolvers = parseCommaSeparatedList(text);
  const invalidResolvers = resolvers.filter((ip) => !isValidIPv4(ip));
  
  if (invalidResolvers.length > 0) {
    throw new Error(
      `Invalid DNS resolver IP addresses: ${invalidResolvers.join(', ')}`
    );
  }
}

/**
 * Validate port rules format.
 *
 * @param {string} text - Port rules text.
 * @throws {Error} If any port rule is invalid.
 */
export function validatePortRules(text) {
  if (!text.trim()) {
    return;
  }
  // This will throw if any rule is invalid
  const rules = parsePortRules(text);
  
  // Additional validation: check port ranges
  rules.forEach((rule) => {
    if (rule.host < 1 || rule.host > 65535) {
      throw new Error(`Host port out of range: ${rule.host}`);
    }
    if (rule.guest < 1 || rule.guest > 65535) {
      throw new Error(`Guest port out of range: ${rule.guest}`);
    }
  });
}

/**
 * Validate a MAC address format.
 *
 * @param {string} mac - MAC address to validate.
 * @returns {boolean} True if valid MAC address format.
 */
export function isValidMacAddress(mac) {
  if (!mac || typeof mac !== 'string') {
    return false;
  }
  // Support both colon and hyphen separators
  const macPattern = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macPattern.test(mac.trim());
}

/**
 * Validate hostname format (RFC 1123).
 *
 * @param {string} hostname - Hostname to validate.
 * @returns {boolean} True if valid hostname.
 */
export function isValidHostname(hostname) {
  if (!hostname || typeof hostname !== 'string') {
    return false;
  }
  const trimmed = hostname.trim();
  
  // Length check
  if (trimmed.length === 0 || trimmed.length > 253) {
    return false;
  }
  // Label pattern: alphanumeric + hyphens, cannot start/end with hyphen
  const labelPattern = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;
  const labels = trimmed.split('.');
  
  return labels.every((label) => labelPattern.test(label));
}

/**
 * Validate resource limits.
 *
 * @param {number} ramMb - RAM in MB.
 * @param {number} vcpus - Number of vCPUs.
 * @param {number} diskGb - Disk size in GB.
 * @param {object} limits - Resource limits object.
 * @throws {Error} If any resource exceeds limits.
 */
export function validateResourceLimits(ramMb, vcpus, diskGb, limits = { maxRamMb: 8192, maxVcpus: 4, maxDiskGb: 20 }) {
  if (ramMb > limits.maxRamMb) {
    throw new Error(`RAM exceeds limit of ${limits.maxRamMb} MB`);
  }
  if (vcpus > limits.maxVcpus) {
    throw new Error(`vCPUs exceeds limit of ${limits.maxVcpus}`);
  }
  if (diskGb > limits.maxDiskGb) {
    throw new Error(`Disk size exceeds limit of ${limits.maxDiskGb} GB`);
  }
}

/**
 * Validate a stored VM config comprehensively.
 *
 * @param {object} config - VM configuration object.
 * @param {object} limits - Resource limits object.
 * @returns {{valid: boolean, errors: string[]}} Validation result.
 */
export function validateStoredConfig(config, limits = { maxRamMb: 8192, maxVcpus: 4, maxDiskGb: 20 }) {
  const errors = [];

  if (!config || !config.vm) {
    errors.push('Config must contain a vm object');
    return { valid: false, errors };
  }

  const vm = config.vm;

  // Validate required fields
  if (!vm.name || !vm.name.trim()) {
    errors.push('VM name is required');
  } else if (!isValidHostname(vm.name)) {
    errors.push('VM name is not a valid hostname');
  }

  if (!vm.user || !vm.user.trim()) {
    errors.push('User is required');
  }

  // Validate resource limits
  try {
    validateResourceLimits(
      vm.ram_mb || 0,
      vm.vcpus || 0,
      vm.disk_gb || 0,
      limits
    );
  } catch (error) {
    errors.push(error.message);
  }

  // Validate DNS resolvers
  if (config.dns?.resolvers) {
    const invalidResolvers = config.dns.resolvers.filter((ip) => !isValidIPv4(ip));
    if (invalidResolvers.length > 0) {
      errors.push(`Invalid DNS resolvers: ${invalidResolvers.join(', ')}`);
    }
  }

  // Validate port rules
  if (config.ports && config.ports.length > 0) {
    config.ports.forEach((port, index) => {
      if (!port.host || !port.guest) {
        errors.push(`Port rule ${index + 1} missing host or guest port`);
      } else if (port.host < 1 || port.host > 65535) {
        errors.push(`Port rule ${index + 1} host port out of range: ${port.host}`);
      } else if (port.guest < 1 || port.guest > 65535) {
        errors.push(`Port rule ${index + 1} guest port out of range: ${port.guest}`);
      }
    });
  }

  // Validate MAC address if present
  if (vm.mac_address && !isValidMacAddress(vm.mac_address)) {
    errors.push(`Invalid MAC address: ${vm.mac_address}`);
  }

  // Validate IP address if present
  if (vm.ip_address && !isValidIPv4(vm.ip_address)) {
    errors.push(`Invalid IP address: ${vm.ip_address}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
