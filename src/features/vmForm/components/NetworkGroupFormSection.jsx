import { Box, Button, MenuItem, TextField } from '@mui/material';

/**
 * Network Group Form Section for creating/selecting network groups.
 *
 * @param {object} props - Component props.
 * @param {string} props.networkGroupId - Selected network group ID.
 * @param {string} props.newNetworkGroupName - New network group name.
 * @param {string} props.newNetworkGroupProfile - New network group profile.
 * @param {string} props.newNetworkGroupSubnet - New network group subnet.
 * @param {Array} props.ownerScopedNetworkGroups - Network groups filtered by owner.
 * @param {object} props.subnetValidation - Subnet validation state.
 * @param {boolean} props.subnetValidating - Whether subnet is being validated.
 * @param {Function} props.onNetworkGroupChange - Network group change handler.
 * @param {Function} props.onNewNetworkGroupNameChange - New group name change handler.
 * @param {Function} props.onNewNetworkGroupProfileChange - New group profile change handler.
 * @param {Function} props.onNewNetworkGroupSubnetChange - New group subnet change handler.
 * @param {Function} props.onSuggestSubnet - Suggest subnet handler.
 * @returns {import('react').JSX.Element} Network Group Form Section.
 */
export default function NetworkGroupFormSection({
  networkGroupId,
  newNetworkGroupName,
  newNetworkGroupProfile,
  newNetworkGroupSubnet,
  ownerScopedNetworkGroups,
  subnetValidation,
  subnetValidating,
  onNetworkGroupChange,
  onNewNetworkGroupNameChange,
  onNewNetworkGroupProfileChange,
  onNewNetworkGroupSubnetChange,
  onSuggestSubnet,
}) {
  return (
    <>
      <TextField
        select
        label="Network group"
        value={networkGroupId}
        onChange={(event) => onNetworkGroupChange(event.target.value)}
        helperText="One libvirt network is shared by all VMs in the same group."
      >
        {ownerScopedNetworkGroups.map((group) => (
          <MenuItem key={group.id} value={group.id}>
            {group.name} ({group.profile})
          </MenuItem>
        ))}
        <MenuItem value="__new__">Create a new network group</MenuItem>
      </TextField>
      {networkGroupId === '__new__' ? (
        <TextField
          label="New network group name"
          value={newNetworkGroupName}
          onChange={(event) => onNewNetworkGroupNameChange(event.target.value)}
        />
      ) : (
        <TextField
          label="Assigned group subnet"
          value={
            ownerScopedNetworkGroups.find((group) => group.id === networkGroupId)?.subnet_cidr ||
            'Assigned by API'
          }
          InputProps={{ readOnly: true }}
        />
      )}
      {networkGroupId === '__new__' ? (
        <>
          <TextField
            select
            label="New group profile"
            value={newNetworkGroupProfile}
            onChange={(event) => onNewNetworkGroupProfileChange(event.target.value)}
            helperText="`isolated_nat` is the recommended default for tenant isolation."
          >
            <MenuItem value="private">private</MenuItem>
            <MenuItem value="nat">nat</MenuItem>
            <MenuItem value="isolated_nat">isolated_nat</MenuItem>
            <MenuItem value="bridged">bridged</MenuItem>
          </TextField>
          {newNetworkGroupProfile !== 'bridged' ? (
            <Box>
              <TextField
                label="Subnet CIDR (optional)"
                value={newNetworkGroupSubnet}
                onChange={(event) => onNewNetworkGroupSubnetChange(event.target.value)}
                placeholder="e.g., 192.168.100.0/29"
                error={subnetValidation.valid === false}
                helperText={
                  subnetValidating
                    ? 'Validating...'
                    : subnetValidation.valid === false
                      ? subnetValidation.error
                      : subnetValidation.valid === true
                        ? '✓ Valid subnet'
                        : 'Leave blank to auto-allocate. Max 8 IPs (/29 or smaller), must be within global pool (10.80.0.0/16), and not overlap existing groups.'
                }
                color={subnetValidation.valid === true ? 'success' : undefined}
                fullWidth
              />
              <Button
                variant="outlined"
                size="small"
                onClick={onSuggestSubnet}
                sx={{ mt: 1 }}
              >
                Auto-Select Available Subnet
              </Button>
            </Box>
          ) : null}
        </>
      ) : null}
    </>
  );
}
