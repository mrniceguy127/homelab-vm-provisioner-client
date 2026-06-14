import { expect, test } from 'vitest';

import {
  buildCloneFormState,
  buildClonedConfig,
  buildUniqueCloneName,
  buildVmPayload,
  createDefaultFormState,
  parseLineCount,
  parsePortRules,
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
      ram_mb: 8192,
      vcpus: 4,
      disk_gb: 80,
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
        ram_mb: 4096,
        vcpus: 2,
        disk_gb: 40,
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
