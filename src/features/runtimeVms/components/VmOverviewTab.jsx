import { Box, FormControlLabel, Paper, Stack, Switch, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { formatJson } from '../../../utils/displayUtils.js';
import JsonPanel from '../../../components/common/JsonPanel.jsx';

/**
 * VM Overview Tab showing runtime info, network, ports, and policies.
 *
 * @param {object} props - Component props.
 * @param {object} props.vmDetail - VM detail object.
 * @param {object|null} props.selectedVmOwner - Owner user object.
 * @param {object|null} props.selectedVmNetworkGroup - Network group object.
 * @param {string} props.vmActionState - Current action state.
 * @param {Function} props.onUpdateVmPolicy - Update VM policy handler.
 * @returns {import('react').JSX.Element} VM Overview Tab.
 */
export default function VmOverviewTab({
  vmDetail,
  selectedVmOwner,
  selectedVmNetworkGroup,
  vmActionState,
  onUpdateVmPolicy,
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
      }}
    >
      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6">Runtime overview</Typography>
          <Typography variant="body2" color="text.secondary">
            Trust: {vmDetail?.trust || 'not set'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Admin key: {vmDetail?.admin_private_key || 'Unavailable'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            VM data dir: {vmDetail?.vm_data_dir || 'Unavailable'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Stored config path: {vmDetail?.storedConfigPath || 'None'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Log path: {vmDetail?.log_path || 'Unavailable'}
          </Typography>
        </Stack>
      </Paper>
      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6">Network + ports</Typography>
          <Typography variant="body2" color="text.secondary">
            Network group:{' '}
            {selectedVmNetworkGroup?.name ||
              vmDetail?.network?.group_name ||
              vmDetail?.network_group_id ||
              'Unavailable'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Subnet: {vmDetail?.network?.subnet_cidr || vmDetail?.network?.cidr || 'Unavailable'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Network: {vmDetail?.network?.name || 'Unavailable'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            CIDR: {vmDetail?.network?.cidr || 'Unavailable'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            VM IP: {vmDetail?.network?.vm_ip || vmDetail?.ip_address || 'Unavailable'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            MAC: {vmDetail?.network?.mac || 'Unavailable'}
          </Typography>
          <Box
            component="pre"
            sx={{
              p: 1.75,
              borderRadius: 2,
              backgroundColor: (theme) => alpha(theme.palette.common.black, 0.24),
            }}
          >
            {vmDetail?.ports?.length
              ? formatJson(vmDetail.ports)
              : 'No forwarded ports configured.'}
          </Box>
        </Stack>
      </Paper>
      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6">Group Isolation</Typography>
          <Typography variant="body2" color="text.secondary">
            Owner: {selectedVmOwner?.username || vmDetail?.owner_user_id || 'unknown'}
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={vmDetail?.allow_same_group_traffic !== false}
                disabled={vmActionState !== 'idle'}
                onChange={(event) =>
                  void onUpdateVmPolicy({
                    allow_same_group_traffic: event.target.checked,
                  })
                }
              />
            }
            label="Allow same network-group traffic"
          />
          <FormControlLabel
            control={
              <Switch
                checked={vmDetail?.internet_access !== false}
                disabled={vmActionState !== 'idle'}
                onChange={(event) =>
                  void onUpdateVmPolicy({
                    internet_access: event.target.checked,
                  })
                }
              />
            }
            label="Allow internet access"
          />
          <FormControlLabel
            control={
              <Switch
                checked={vmDetail?.allow_host_access !== false}
                disabled={vmActionState !== 'idle'}
                onChange={(event) =>
                  void onUpdateVmPolicy({
                    allow_host_access: event.target.checked,
                  })
                }
              />
            }
            label="Allow hypervisor host access"
          />
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(vmDetail?.allow_private_lan_access)}
                disabled={vmActionState !== 'idle' || (selectedVmOwner?.role || '') !== 'admin'}
                onChange={(event) =>
                  void onUpdateVmPolicy({
                    allow_private_lan_access: event.target.checked,
                  })
                }
              />
            }
            label="Allow private LAN access"
          />
        </Stack>
      </Paper>
      <JsonPanel
        title="Libvirt domain info"
        subtitle="Raw dominfo fields as returned by the Python bridge."
        value={formatJson(vmDetail?.dominfo || {})}
      />
      <JsonPanel
        title="Discovered network object"
        subtitle="The merged network payload returned for this VM."
        value={formatJson(vmDetail?.network || {})}
      />
    </Box>
  );
}
