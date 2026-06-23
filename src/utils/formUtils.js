/**
 * Form state management and parsing utilities.
 */

export const MAX_VM_NAME_LENGTH = 63;

const baseFormState = {
  name: '',
  user: '',
  ownerUserId: '',
  networkGroupId: '',
  newNetworkGroupName: '',
  newNetworkGroupProfile: 'isolated_nat',
  newNetworkGroupSubnet: '',
  ramMb: '2048',
  vcpus: '2',
  diskGb: '10',
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
    throw new Error(`${label} must be a positive integer (got: ${value})`);
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
    throw new Error(`Line count must be between 1 and 5000 (got: ${value})`);
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
      const match = /^(\d+):(\d+)(?:\/(tcp|udp))?$/i.exec(line);
      if (!match) {
        throw new Error(`Invalid port rule on line ${index + 1}: ${line}`);
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
