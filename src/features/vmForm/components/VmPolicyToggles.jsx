import { FormControlLabel, Switch } from '@mui/material';

/**
 * VM Policy Toggles for network and access controls.
 *
 * @param {object} props - Component props.
 * @param {boolean} props.allowSudo - Allow sudo toggle.
 * @param {boolean} props.allowSameGroupTraffic - Allow same-group traffic toggle.
 * @param {boolean} props.internetAccess - Internet access toggle.
 * @param {boolean} props.allowHostAccess - Host access toggle.
 * @param {boolean} props.allowPrivateLanAccess - Private LAN access toggle.
 * @param {boolean} props.isAdmin - Whether owner is admin.
 * @param {Function} props.onAllowSudoChange - Allow sudo change handler.
 * @param {Function} props.onAllowSameGroupTrafficChange - Same-group traffic change handler.
 * @param {Function} props.onInternetAccessChange - Internet access change handler.
 * @param {Function} props.onAllowHostAccessChange - Host access change handler.
 * @param {Function} props.onAllowPrivateLanAccessChange - Private LAN access change handler.
 * @returns {import('react').JSX.Element} VM Policy Toggles.
 */
export default function VmPolicyToggles({
  allowSudo,
  allowSameGroupTraffic,
  internetAccess,
  allowHostAccess,
  allowPrivateLanAccess,
  isAdmin,
  onAllowSudoChange,
  onAllowSameGroupTrafficChange,
  onInternetAccessChange,
  onAllowHostAccessChange,
  onAllowPrivateLanAccessChange,
}) {
  return (
    <>
      <FormControlLabel
        control={
          <Switch checked={allowSudo} onChange={(event) => onAllowSudoChange(event.target.checked)} />
        }
        label="Grant passwordless sudo to the tenant user"
      />
      <FormControlLabel
        control={
          <Switch
            checked={allowSameGroupTraffic}
            onChange={(event) => onAllowSameGroupTrafficChange(event.target.checked)}
          />
        }
        label="Allow same-group VM traffic"
      />
      <FormControlLabel
        control={
          <Switch
            checked={internetAccess}
            onChange={(event) => onInternetAccessChange(event.target.checked)}
          />
        }
        label="Allow internet access"
      />
      <FormControlLabel
        control={
          <Switch
            checked={allowHostAccess}
            onChange={(event) => onAllowHostAccessChange(event.target.checked)}
          />
        }
        label="Allow host access"
      />
      <FormControlLabel
        control={
          <Switch
            checked={allowPrivateLanAccess}
            disabled={!isAdmin}
            onChange={(event) => onAllowPrivateLanAccessChange(event.target.checked)}
          />
        }
        label="Allow private LAN access (admin only)"
      />
    </>
  );
}
