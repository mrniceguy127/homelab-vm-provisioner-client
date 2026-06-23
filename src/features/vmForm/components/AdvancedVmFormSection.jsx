import { TextField } from '@mui/material';

/**
 * Advanced VM Form Section for packages, DNS, ports, SSH, and scripts.
 *
 * @param {object} props - Component props.
 * @param {string} props.packagesText - Packages text.
 * @param {string} props.dnsResolversText - DNS resolvers text.
 * @param {string} props.portsText - Ports text.
 * @param {string} props.sshPublicKey - SSH public key.
 * @param {string} props.setupScript - Setup script content.
 * @param {string} props.formMode - Form mode (create/edit/clone).
 * @param {Function} props.onPackagesChange - Packages change handler.
 * @param {Function} props.onDnsResolversChange - DNS resolvers change handler.
 * @param {Function} props.onPortsChange - Ports change handler.
 * @param {Function} props.onSshPublicKeyChange - SSH public key change handler.
 * @param {Function} props.onSetupScriptChange - Setup script change handler.
 * @returns {import('react').JSX.Element} Advanced VM Form Section.
 */
export default function AdvancedVmFormSection({
  packagesText,
  dnsResolversText,
  portsText,
  sshPublicKey,
  setupScript,
  formMode,
  onPackagesChange,
  onDnsResolversChange,
  onPortsChange,
  onSshPublicKeyChange,
  onSetupScriptChange,
}) {
  return (
    <>
      <TextField
        multiline
        minRows={3}
        label="Packages"
        value={packagesText}
        onChange={(event) => onPackagesChange(event.target.value)}
        helperText="Comma-separated, for example: git, tmux, htop"
      />
      <TextField
        multiline
        minRows={3}
        label="DNS resolvers"
        value={dnsResolversText}
        onChange={(event) => onDnsResolversChange(event.target.value)}
        helperText="Comma-separated IP addresses. Leave blank to use provisioner defaults."
      />
      <TextField
        multiline
        minRows={4}
        label="Forwarded ports"
        value={portsText}
        onChange={(event) => onPortsChange(event.target.value)}
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
        value={sshPublicKey}
        onChange={(event) => onSshPublicKeyChange(event.target.value)}
        helperText={
          formMode === 'clone'
            ? 'Optional. Provide a new tenant SSH key for the clone. When provided, the API stores the key internally.'
            : 'Optional. When provided, the API stores the key internally for VM provisioning.'
        }
      />
      <TextField
        multiline
        minRows={6}
        label="Post-cloud-init setup script"
        value={setupScript}
        onChange={(event) => onSetupScriptChange(event.target.value)}
        helperText={
          formMode === 'clone'
            ? 'Optional. Review whether the source setup script still applies to the clone.'
            : 'Optional shell script content to run after the built-in cloud-init commands finish.'
        }
      />
    </>
  );
}
