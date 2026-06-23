/**
 * Dashboard metric card component.
 */

import { Box, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

/**
 * Render a dashboard summary metric.
 *
 * @param {object} props - Component props.
 * @param {string} props.title - Metric title.
 * @param {string|number} props.value - Metric value.
 * @param {string} props.caption - Supporting caption.
 * @param {import('react').ReactNode} props.icon - Metric icon.
 * @returns {import('react').JSX.Element} Metric card component.
 */
export default function MetricCard({ title, value, caption, icon }) {
  return (
    <Paper
      sx={{
        p: 2.5,
        minHeight: 144,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: (theme) =>
          `linear-gradient(145deg, ${alpha(theme.palette.common.white, 0.06)}, ${alpha(theme.palette.primary.main, 0.08)})`,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h5" sx={{ mt: 1 }}>
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.16),
            color: 'primary.main',
          }}
        >
          {icon}
        </Box>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {caption}
      </Typography>
    </Paper>
  );
}
