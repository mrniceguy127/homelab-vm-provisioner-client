import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import StopRoundedIcon from '@mui/icons-material/StopRounded';

/**
 * VM Power Controls for start/stop actions.
 *
 * @param {object} props - Component props.
 * @param {string} props.powerStateLabel - Power state label.
 * @param {string} props.powerStateColor - Power state chip color.
 * @param {boolean} props.canStart - Whether VM can be started.
 * @param {boolean} props.canStop - Whether VM can be stopped.
 * @param {string} props.actionState - Current action state.
 * @param {Function} props.onStart - Start VM handler.
 * @param {Function} props.onStop - Stop VM handler.
 * @returns {import('react').JSX.Element} VM Power Controls.
 */
export default function VmPowerControls({
  powerStateLabel,
  powerStateColor,
  canStart,
  canStop,
  actionState,
  onStart,
  onStop,
}) {
  return (
    <Box
      sx={{
        px: 1.5,
        py: 1.25,
        borderRadius: 2.5,
        border: (theme) => `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
        backgroundColor: (theme) => alpha(theme.palette.common.white, 0.03),
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.25}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
      >
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="body2" color="text.secondary">
            Power controls
          </Typography>
          <Chip size="small" color={powerStateColor} label={powerStateLabel} />
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            variant="contained"
            startIcon={<PlayArrowRoundedIcon />}
            disabled={actionState !== 'idle' || !canStart}
            onClick={onStart}
          >
            {actionState === 'start' ? 'Starting…' : 'Start'}
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<StopRoundedIcon />}
            disabled={actionState !== 'idle' || !canStop}
            onClick={onStop}
          >
            {actionState === 'stop' ? 'Stopping…' : 'Stop'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
