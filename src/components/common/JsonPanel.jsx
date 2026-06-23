/**
 * JSON text panel component.
 */

import { Box, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

/**
 * Render a titled JSON text panel.
 *
 * @param {object} props - Component props.
 * @param {string} props.title - Panel title.
 * @param {string} [props.subtitle] - Optional subtitle.
 * @param {string} props.value - Preformatted JSON text.
 * @returns {import('react').JSX.Element} JSON panel component.
 */
export default function JsonPanel({ title, subtitle, value }) {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Stack spacing={1.5}>
        <Box>
          <Typography variant="h6">{title}</Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        <Box
          component="pre"
          sx={{
            p: 2,
            borderRadius: 2,
            overflow: 'auto',
            backgroundColor: (theme) => alpha(theme.palette.common.black, 0.24),
            color: 'text.primary',
          }}
        >
          {value}
        </Box>
      </Stack>
    </Paper>
  );
}
