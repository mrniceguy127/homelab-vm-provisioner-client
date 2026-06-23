import { Box, Chip, Stack, Typography } from '@mui/material';

/**
 * VM Detail Header showing VM name, status, network, and owner.
 *
 * @param {object} props - Component props.
 * @param {string} props.vmName - VM name.
 * @param {object} props.statusDescriptor - Status descriptor with label and color.
 * @param {boolean} props.hasTemplate - Whether VM has a template.
 * @param {string|null} props.networkGroupName - Network group name.
 * @param {string} props.ipAddress - VM IP address.
 * @param {string} props.networkProfile - Network profile.
 * @param {string} props.ownerUsername - Owner username.
 * @param {string} props.macAddress - MAC address.
 * @returns {import('react').JSX.Element} VM Detail Header.
 */
export default function VmDetailHeader({
  vmName,
  statusDescriptor,
  hasTemplate,
  networkGroupName,
  ipAddress,
  networkProfile,
  ownerUsername,
  macAddress,
}) {
  return (
    <Box>
      <Stack direction="row" spacing={1.2} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="h4">{vmName}</Typography>
        <Chip color={statusDescriptor.color} label={statusDescriptor.label} />
        {hasTemplate ? <Chip variant="outlined" color="secondary" label="Has template" /> : null}
        {networkGroupName ? <Chip variant="outlined" label={networkGroupName} /> : null}
      </Stack>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
        {ipAddress || 'No live IP reported'} • {networkProfile || 'No network profile reported'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
        Owner: {ownerUsername || 'unknown'} • MAC: {macAddress || 'Unavailable'}
      </Typography>
    </Box>
  );
}
