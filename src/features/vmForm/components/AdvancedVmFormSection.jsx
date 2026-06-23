import { TextField } from '@mui/material';

/**
 * Advanced VM Form Section for packages, DNS, ports, SSH, and scripts.
 *
 * @param {object} props - Component props.
 * @param {string} props.packagesText - Packages text.
 * @param {string} props.dnsResolversText - DNS resolvers text.
 * @param {string} props.portsText - Ports text.
 * @param {string} props.sshPublicKey - SSH public key.
 * @param {string} props.sshKeyFile - SSH key file path.
 * @param {string} props.setupScript - Setup script content.
 * @param {string} props.setupScriptFile - Setup script file path.
 * @param {string} props.formMode - Form mode (create/edit/clone).
 * @param {Function} props.onPackagesChange - Packages change handler.
 * @param {Function} props.onDnsResolversChange - DNS resolvers change handler.
 * @param {Function} props.onPortsChange - Ports change handler.
 * @param {Function} props.onSshPublicKeyChange - SSH public key change handler.
 * @param {Function} props.onSshKeyFileChange - SSH key file change handler.
 * @param {Function} props.onSetupScriptChange - Setup script change handler.
 * @param {Function} props.onSetupScriptFileChange - Setup script file change handler.
 * @returns {import('react').JSX.Element} Advanced VM Form Section.
 */
export default function AdvancedVmFormSection({
  packagesText,
  dnsResolversText,
  portsText,
  sshPublicKey,
  sshKeyFile,
  setupScript,
  setupScriptFile,
  formMode,
  onPackagesChange,
  onDnsResolversChange,
  onPortsChange,
  onSshPublicKeyChange,
  onSshKeyFileChange,
  onSetupScriptChange,
  onSetupScriptFileChange,
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
            ? 'Optional. Provide a new tenant SSH key for the clone. When provided, the API stores the key under the provisioner user-keys directory and rewrites vm.ssh_key_file automatically.'
            : 'When provided, the API stores the key under the provisioner user-keys directory and rewrites vm.ssh_key_file automatically.'
        }
      />
      <TextField
        multiline
        minRows={2}
        label="Existing absolute SSH key path"
        value={sshKeyFile}
        onChange={(event) => onSshKeyFileChange(event.target.value)}
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
        value={setupScript}
        onChange={(event) => onSetupScriptChange(event.target.value)}
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
        value={setupScriptFile}
        onChange={(event) => onSetupScriptFileChange(event.target.value)}
        helperText={
          formMode === 'clone'
            ? 'Optional. Review whether the source setup script path should be reused for the clone.'
            : 'Use this only when you are not submitting setupScript content.'
        }
      />
    </>
  );
}
