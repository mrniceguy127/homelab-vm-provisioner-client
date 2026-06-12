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
    vm: { name: 'devbox', user: 'matt', ssh_key_file: '/keys/devbox.pub' },
    network: { mode: 'nat-custom', subnet_prefix: '192.168.240', mac: '52:54:00:aa:bb:cc' },
    paths: { vm_data_dir: '/tmp/other-path' },
  }, 'clonebox');

  expect(cloned.vm.name).toBe('clonebox');
  expect(cloned.vm.ssh_key_file).toBeUndefined();
  expect(cloned.network).toBeUndefined();
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
      },
      network: { mode: 'bridge', bridge_name: 'br1' },
  }, 'clonebox');

  expect(formState.name).toBe('clonebox');
  expect(formState.networkMode).toBe('nat-auto');
  expect(formState.sshKeyFile).toBe('');
});

test('buildVmPayload creates the expected API request shape', () => {
  const formState = {
    ...createDefaultFormState(),
    name: 'devbox',
    user: 'matt',
    allowSudo: true,
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
        ram_mb: 4096,
        vcpus: 2,
        disk_gb: 40,
        trust: 'trusted',
        allow_sudo: true,
      },
      network: {
        mode: 'nat-auto',
      },
      packages: ['git', 'tmux'],
      dns: { resolvers: ['1.1.1.1', '1.0.0.1'] },
      ports: [{ host: 2222, guest: 22, proto: 'tcp' }],
    },
    sshPublicKey: 'ssh-ed25519 AAAATEST user@example',
    setupScript: '#!/bin/sh\necho ready',
  });
});
