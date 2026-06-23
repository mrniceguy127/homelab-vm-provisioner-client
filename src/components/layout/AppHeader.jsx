import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloudDoneRoundedIcon from '@mui/icons-material/CloudDoneRounded';
import DnsRoundedIcon from '@mui/icons-material/DnsRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded';

import MetricCard from '../common/MetricCard.jsx';

/**
 * Application header with hero section, API controls, and metrics.
 *
 * @param {object} props - Component props.
 * @param {string} props.apiBaseInput - API base input value.
 * @param {string} props.apiBase - Current API base URL.
 * @param {object} props.health - API health status.
 * @param {object} props.metrics - Metrics data.
 * @param {Function} props.onApiBaseInputChange - API base input change handler.
 * @param {Function} props.onConnect - Connect button handler.
 * @param {Function} props.onRefresh - Refresh inventory handler.
 * @param {Function} props.onNewVm - New VM button handler.
 * @returns {import('react').JSX.Element} App header.
 */
export default function AppHeader({
  apiBaseInput,
  apiBase,
  health,
  metrics,
  onApiBaseInputChange,
  onConnect,
  onRefresh,
  onNewVm,
}) {
  return (
    <Paper sx={{ p: { xs: 2.5, md: 3.5 } }}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          justifyContent="space-between"
          spacing={2.5}
        >
          <Box sx={{ maxWidth: 760 }}>
            <Typography variant="overline" color="primary.main" sx={{ letterSpacing: '0.18em' }}>
              HOMELAB VM CONTROL SURFACE
            </Typography>
            <Typography variant="h3" sx={{ mt: 1.2 }}>
              An elegant dark console for provisioning and operating VMs.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5, maxWidth: 640 }}>
              Manage VM templates, inspect runtime VMs, follow libvirt logs live, and control your
              infrastructure without leaving the browser.
            </Typography>
          </Box>

          <Stack spacing={1.5} sx={{ minWidth: { lg: 380 } }}>
            <TextField
              label="API base URL"
              size="small"
              value={apiBaseInput}
              onChange={(event) => onApiBaseInputChange(event.target.value)}
              helperText="Leave blank to use the Vite dev proxy to http://localhost:3000."
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems="stretch">
              <Button variant="contained" startIcon={<CloudDoneRoundedIcon />} onClick={onConnect}>
                Connect
              </Button>
              <Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={onRefresh}>
                Refresh Inventory
              </Button>
              <Button variant="outlined" color="secondary" startIcon={<AddRoundedIcon />} onClick={onNewVm}>
                New VM
              </Button>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                icon={<CloudDoneRoundedIcon />}
                label={health.message}
                color={
                  health.state === 'ok' ? 'success' : health.state === 'error' ? 'error' : 'default'
                }
                variant={health.state === 'checking' ? 'outlined' : 'filled'}
              />
              <Chip label={apiBase.trim() || 'Using same-origin proxy'} variant="outlined" />
            </Stack>
          </Stack>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' },
          }}
        >
          <MetricCard
            title="Total inventory"
            value={metrics.total}
            caption="Merged view of templates and active VMs."
            icon={<DnsRoundedIcon />}
          />
          <MetricCard
            title="Running VMs"
            value={metrics.running}
            caption="Machines the API currently sees in a running state."
            icon={<RocketLaunchRoundedIcon />}
          />
          <MetricCard
            title="Saved templates"
            value={metrics.configured}
            caption="VM templates available for provisioning on any host."
            icon={<SaveRoundedIcon />}
          />
          <MetricCard
            title="Attention needed"
            value={metrics.issues}
            caption="Configs or machines with missing state, errors, or no live presence."
            icon={<TerminalRoundedIcon />}
          />
        </Box>
      </Stack>
    </Paper>
  );
}
