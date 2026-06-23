import { expect, test } from 'vitest';

import {
  buildCloneFormState,
  buildClonedConfig,
  buildFormStateFromConfig,
  buildStatusDescriptor,
  buildUniqueCloneName,
  buildVmPayload,
  createDefaultFormState,
  escapeRegExp,
  formatJson,
  formatNetworkSummary,
  isValidIPv4,
  isVmRunning,
  normalizeVmName,
  parseCommaSeparatedList,
  parseLineCount,
  parsePortRules,
  parsePositiveInteger,
  validateDnsResolvers,
  validatePortRules,
} from '../src/App.jsx';

test('parsePortRules supports proto suffixes and defaults to tcp', () => {
  expect(parsePortRules('2222:22\n8080:80/udp')).toEqual([
    { host: 2222, guest: 22, proto: 'tcp' },
    { host: 8080, guest: 80, proto: 'udp' },
  ]);
});

test('parseLineCount returns the fallback for empty values', () => {
  expect(parseLineCount('', 200)).toBe(200);
});

test('buildUniqueCloneName appends a numeric suffix within length limits', () => {
  expect(buildUniqueCloneName('devbox', new Set(['devbox', 'devbox-2']))).toBe('devbox-3');
});

test('buildClonedConfig rewrites the VM name, clears network, and removes SSH key reuse', () => {
  const cloned = buildClonedConfig({
    vm: {
      name: 'devbox',
      user: 'matt',
      ssh_key_file: '/keys/devbox.pub',
      mac_address: '52:54:00:11:22:33',
      ip_address: '10.80.0.2',
    },
    network: { mode: 'nat-custom', subnet_prefix: '192.168.240', mac: '52:54:00:aa:bb:cc' },
    ports: [{ host: 2222, guest: 22, proto: 'tcp' }],
    paths: { vm_data_dir: '/tmp/other-path' },
  }, 'clonebox');

  expect(cloned.vm.name).toBe('clonebox');
  expect(cloned.vm.mac_address).toBeUndefined();
  expect(cloned.vm.ip_address).toBeUndefined();
  expect(cloned.vm.ssh_key_file).toBeUndefined();
  expect(cloned.network).toBeUndefined();
  expect(cloned.ports).toBeUndefined();
  expect(cloned.paths).toBeUndefined();
});

test('buildCloneFormState produces a sanitized clone form', () => {
  const formState = buildCloneFormState({
    vm: {
      name: 'devbox',
      user: 'matt',
      ssh_key_file: '/keys/devbox.pub',
      ram_mb: 2048,
      vcpus: 2,
      disk_gb: 10,
      allow_sudo: true,
      trust: 'trusted',
      owner_user_id: 'user-admin',
      network_group_id: 'ng-admin',
    },
    network: { profile: 'isolated_nat', network_group_id: 'ng-admin' },
    ports: [{ host: 2222, guest: 22, proto: 'tcp' }],
  }, 'clonebox');

  expect(formState.name).toBe('clonebox');
  expect(formState.networkGroupId).toBe('ng-admin');
  expect(formState.portsText).toBe('');
  expect(formState.sshKeyFile).toBe('');
});

test('buildVmPayload creates the expected API request shape', () => {
  const formState = {
    ...createDefaultFormState(),
    name: 'devbox',
    user: 'matt',
    ownerUserId: 'user-admin',
    networkGroupId: 'ng-admin',
    allowSudo: true,
    allowSameGroupTraffic: true,
    allowHostAccess: true,
    allowPrivateLanAccess: false,
    internetAccess: true,
    trust: 'trusted',
    packagesText: 'git, tmux',
    dnsResolversText: '1.1.1.1, 1.0.0.1',
    portsText: '2222:22/tcp',
    sshPublicKey: 'ssh-ed25519 AAAATEST user@example',
    setupScript: '#!/bin/sh\necho ready',
  };

  expect(buildVmPayload(formState)).toEqual({
    config: {
      vm: {
        name: 'devbox',
        user: 'matt',
        owner_user_id: 'user-admin',
        network_group_id: 'ng-admin',
        ram_mb: 2048,
        vcpus: 2,
        disk_gb: 10,
        allow_same_group_traffic: true,
        allow_host_access: true,
        allow_private_lan_access: false,
        internet_access: true,
        trust: 'trusted',
        allow_sudo: true,
      },
      packages: ['git', 'tmux'],
      dns: { resolvers: ['1.1.1.1', '1.0.0.1'] },
      ports: [{ host: 2222, guest: 22, proto: 'tcp' }],
    },
    sshPublicKey: 'ssh-ed25519 AAAATEST user@example',
    setupScript: '#!/bin/sh\necho ready',
  });
});

test('parsePositiveInteger validates and parses integer values', () => {
  expect(parsePositiveInteger('100', 'test')).toBe(100);
  expect(parsePositiveInteger('5', 'test')).toBe(5);
  expect(() => parsePositiveInteger('0', 'test')).toThrow('must be a positive integer');
  expect(() => parsePositiveInteger('-5', 'test')).toThrow('must be a positive integer');
  expect(() => parsePositiveInteger('abc', 'test')).toThrow('must be a positive integer');
});

test('parseCommaSeparatedList splits and trims values', () => {
  expect(parseCommaSeparatedList('a, b, c')).toEqual(['a', 'b', 'c']);
  expect(parseCommaSeparatedList('one,two,three')).toEqual(['one', 'two', 'three']);
  expect(parseCommaSeparatedList('  spaced  ,  items  ')).toEqual(['spaced', 'items']);
  expect(parseCommaSeparatedList('')).toEqual([]);
  expect(parseCommaSeparatedList('single')).toEqual(['single']);
});

test('normalizeVmName converts to lowercase and trims', () => {
  expect(normalizeVmName('MyVM')).toBe('myvm');
  expect(normalizeVmName('  devbox  ')).toBe('devbox');
  expect(normalizeVmName('Test-123')).toBe('test-123');
});

test('escapeRegExp escapes special regex characters', () => {
  expect(escapeRegExp('a.b*c?')).toBe('a\\.b\\*c\\?');
  expect(escapeRegExp('[test]')).toBe('\\[test\\]');
  expect(escapeRegExp('(hello)')).toBe('\\(hello\\)');
});

test('buildFormStateFromConfig maps config to form state', () => {
  const config = {
    vm: {
      name: 'testvm',
      user: 'testuser',
      ram_mb: 2048,
      vcpus: 2,
      disk_gb: 10,
      allow_sudo: true,
      trust: 'trusted',
      owner_user_id: 'user-1',
      network_group_id: 'ng-1',
      allow_same_group_traffic: false,
      allow_host_access: false,
      allow_private_lan_access: true,
      internet_access: false,
    },
    packages: ['git', 'curl'],
    dns: { resolvers: ['8.8.8.8', '8.8.4.4'] },
    ports: [{ host: 2222, guest: 22, proto: 'tcp' }],
  };

  const formState = buildFormStateFromConfig(config);

  expect(formState.name).toBe('testvm');
  expect(formState.user).toBe('testuser');
  expect(formState.ramMb).toBe('2048');
  expect(formState.vcpus).toBe('2');
  expect(formState.diskGb).toBe('10');
  expect(formState.allowSudo).toBe(true);
  expect(formState.trust).toBe('trusted');
  expect(formState.ownerUserId).toBe('user-1');
  expect(formState.networkGroupId).toBe('ng-1');
  expect(formState.allowSameGroupTraffic).toBe(false);
  expect(formState.allowHostAccess).toBe(false);
  expect(formState.allowPrivateLanAccess).toBe(true);
  expect(formState.internetAccess).toBe(false);
  expect(formState.packagesText).toBe('git, curl');
  expect(formState.dnsResolversText).toBe('8.8.8.8, 8.8.4.4');
  expect(formState.portsText).toBe('2222:22/tcp');
});

test('buildStatusDescriptor returns correct status info', () => {
  expect(buildStatusDescriptor({ status: 'running', exists: true })).toEqual({
    label: 'Running',
    color: 'success',
  });
  
  expect(buildStatusDescriptor({ status: 'shut off', exists: true })).toEqual({
    label: 'shut off',
    color: 'warning',
  });
  
  expect(buildStatusDescriptor({ status: 'paused', exists: true })).toEqual({
    label: 'paused',
    color: 'warning',
  });
  
  expect(buildStatusDescriptor({ status: 'unknown', exists: false, configured: true })).toEqual({
    label: 'Template only',
    color: 'secondary',
  });
  
  expect(buildStatusDescriptor({ status: 'crashed', exists: true })).toEqual({
    label: 'crashed',
    color: 'warning',
  });
});

test('isVmRunning checks if VM is running', () => {
  expect(isVmRunning({ status: 'running', exists: true })).toBe(true);
  expect(isVmRunning({ status: 'shut off', exists: true })).toBe(false);
  expect(isVmRunning({ status: 'paused', exists: true })).toBe(false);
  expect(isVmRunning({ status: 'unknown', exists: false })).toBe(false);
});

test('formatJson formats JavaScript objects as JSON', () => {
  expect(formatJson({ name: 'test', count: 42 })).toBe('{\n  "name": "test",\n  "count": 42\n}');
  expect(formatJson(null)).toBe('{}');
  expect(formatJson(undefined)).toBe('{}');
  expect(formatJson(['a', 'b', 'c'])).toContain('"a"');
});

test('formatNetworkSummary formats network information', () => {
  const vm = {
    network: {
      profile: 'isolated_nat',
      subnet_cidr: '10.80.0.0/28',
      vm_ip: '10.80.0.2',
      mac: '52:54:00:11:22:33',
    },
  };
  
  const summary = formatNetworkSummary(vm);
  
  expect(summary).toContain('isolated_nat');
  expect(summary).toContain('10.80.0.2');
});

test('formatNetworkSummary handles missing network data', () => {
  expect(formatNetworkSummary({ network: null })).toBe('No discovered network');
  expect(formatNetworkSummary({})).toBe('No discovered network');
});

test('createDefaultFormState returns default values', () => {
  const defaults = createDefaultFormState();
  
  expect(defaults.name).toBe('');
  expect(defaults.user).toBe('');
  expect(defaults.ramMb).toBe('2048');
  expect(defaults.vcpus).toBe('2');
  expect(defaults.diskGb).toBe('10');
  expect(defaults.allowSudo).toBe(true);
  expect(defaults.trust).toBe('untrusted');
  expect(defaults.allowSameGroupTraffic).toBe(true);
  expect(defaults.allowHostAccess).toBe(true);
  expect(defaults.allowPrivateLanAccess).toBe(false);
  expect(defaults.internetAccess).toBe(true);
});

test('isValidIPv4 validates IPv4 addresses', () => {
  expect(isValidIPv4('192.168.1.1')).toBe(true);
  expect(isValidIPv4('10.0.0.1')).toBe(true);
  expect(isValidIPv4('8.8.8.8')).toBe(true);
  expect(isValidIPv4('0.0.0.0')).toBe(true);
  expect(isValidIPv4('255.255.255.255')).toBe(true);

  expect(isValidIPv4('256.1.1.1')).toBe(false);
  expect(isValidIPv4('192.168.1')).toBe(false);
  expect(isValidIPv4('192.168.1.1.1')).toBe(false);
  expect(isValidIPv4('192.168.-1.1')).toBe(false);
  expect(isValidIPv4('not.an.ip.address')).toBe(false);
  expect(isValidIPv4('')).toBe(false);
  expect(isValidIPv4(null)).toBe(false);
  expect(isValidIPv4(undefined)).toBe(false);
});

test('validateDnsResolvers allows empty input', () => {
  expect(() => validateDnsResolvers('')).not.toThrow();
  expect(() => validateDnsResolvers('  ')).not.toThrow();
});

test('validateDnsResolvers allows valid IP addresses', () => {
  expect(() => validateDnsResolvers('8.8.8.8')).not.toThrow();
  expect(() => validateDnsResolvers('8.8.8.8, 1.1.1.1')).not.toThrow();
  expect(() => validateDnsResolvers('192.168.1.1, 10.0.0.1, 8.8.4.4')).not.toThrow();
});

test('validateDnsResolvers throws on invalid IP addresses', () => {
  expect(() => validateDnsResolvers('256.1.1.1')).toThrow(/Invalid DNS resolver/);
  expect(() => validateDnsResolvers('8.8.8.8, invalid, 1.1.1.1')).toThrow(/invalid/);
  expect(() => validateDnsResolvers('not-an-ip')).toThrow(/Invalid DNS resolver/);
});

test('validatePortRules allows empty input', () => {
  expect(() => validatePortRules('')).not.toThrow();
  expect(() => validatePortRules('  \n  ')).not.toThrow();
});

test('validatePortRules allows valid port rules', () => {
  expect(() => validatePortRules('8080:80')).not.toThrow();
  expect(() => validatePortRules('8080:80/tcp')).not.toThrow();
  expect(() => validatePortRules('8080:80\n9000:9000/udp')).not.toThrow();
});

test('validatePortRules throws on invalid port rules', () => {
  expect(() => validatePortRules('invalid')).toThrow(/Port rule/);
  expect(() => validatePortRules('8080')).toThrow(/Port rule/);
  expect(() => validatePortRules('8080:80\ninvalid')).toThrow(/Port rule/);
});
