import { MenuItem, TextField } from '@mui/material';
import { MAX_VM_NAME_LENGTH } from '../../../utils/formUtils.js';

/**
 * Basic VM Form Section for VM name, user, trust, and resources.
 *
 * @param {object} props - Component props.
 * @param {string} props.name - VM name.
 * @param {string} props.user - Tenant user.
 * @param {string} props.trust - Trust level.
 * @param {string} props.ramMb - RAM in MB.
 * @param {string} props.vcpus - vCPUs.
 * @param {string} props.diskGb - Disk in GB.
 * @param {boolean} props.nameAutoFocus - Whether name field should auto-focus.
 * @param {string} props.nameLabel - Name field label.
 * @param {boolean} props.nameError - Whether name has an error.
 * @param {string} props.nameHelperText - Name field helper text.
 * @param {Function} props.onNameChange - Name change handler.
 * @param {Function} props.onUserChange - User change handler.
 * @param {Function} props.onTrustChange - Trust change handler.
 * @param {Function} props.onRamChange - RAM change handler.
 * @param {Function} props.onVcpusChange - vCPUs change handler.
 * @param {Function} props.onDiskChange - Disk change handler.
 * @returns {import('react').JSX.Element} Basic VM Form Section.
 */
export default function BasicVmFormSection({
  name,
  user,
  trust,
  ramMb,
  vcpus,
  diskGb,
  nameAutoFocus,
  nameLabel,
  nameError,
  nameHelperText,
  onNameChange,
  onUserChange,
  onTrustChange,
  onRamChange,
  onVcpusChange,
  onDiskChange,
}) {
  return (
    <>
      <TextField
        autoFocus={nameAutoFocus}
        label={nameLabel}
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        inputProps={{ maxLength: MAX_VM_NAME_LENGTH }}
        error={nameError}
        helperText={nameHelperText}
      />
      <TextField
        label="Tenant user"
        value={user}
        onChange={(event) => onUserChange(event.target.value)}
      />
      <TextField
        select
        label="Trust"
        value={trust}
        onChange={(event) => onTrustChange(event.target.value)}
      >
        <MenuItem value="untrusted">untrusted</MenuItem>
        <MenuItem value="trusted">trusted</MenuItem>
      </TextField>
      <TextField
        type="number"
        label="RAM (MB)"
        value={ramMb}
        onChange={(event) => onRamChange(event.target.value)}
      />
      <TextField
        type="number"
        label="vCPUs"
        value={vcpus}
        onChange={(event) => onVcpusChange(event.target.value)}
      />
      <TextField
        type="number"
        label="Disk (GB)"
        value={diskGb}
        onChange={(event) => onDiskChange(event.target.value)}
      />
    </>
  );
}
