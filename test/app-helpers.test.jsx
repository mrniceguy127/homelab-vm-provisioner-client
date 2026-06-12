import { expect, test } from 'vitest';

import {
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

test('buildClonedConfig rewrites the VM name and removes mismatched vm_data_dir overrides', () => {
  const cloned = buildClonedConfig({
    vm: { name: 'devbox', user: 'matt' },
    paths: { vm_data_dir: '/tmp/other-path' },
  }, 'clonebox');

  expect(cloned.vm.name).toBe('clonebox');
  expect(cloned.paths).toBeUndefined();
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
        template: 'base',
      },
      network: {
        mode: 'nat-auto',
      },
      packages: ['git', 'tmux'],
      dns: { resolvers: ['1.1.1.1', '1.0.0.1'] },
      ports: [{ host: 2222, guest: 22, proto: 'tcp' }],
    },
    sshPublicKey: 'ssh-ed25519 AAAATEST user@example',
  });
});
