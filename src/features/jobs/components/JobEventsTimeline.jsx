import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

/**
 * Job Events Timeline showing event list.
 *
 * @param {object} props - Component props.
 * @param {Array} props.jobEvents - Job events array.
 * @returns {import('react').JSX.Element} Job Events Timeline.
 */
export default function JobEventsTimeline({ jobEvents }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Event Timeline
      </Typography>
      {jobEvents.length > 0 ? (
        <Stack spacing={1} sx={{ mt: 1.5 }}>
          {jobEvents.map((event, index) => (
            <Box
              key={event.id || index}
              sx={{
                display: 'flex',
                gap: 1.5,
                p: 1,
                borderRadius: 1,
                backgroundColor: (theme) => alpha(theme.palette.common.white, 0.02),
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ minWidth: 80, fontFamily: 'monospace' }}
              >
                {new Date(event.created_at).toLocaleTimeString()}
              </Typography>
              <Chip
                size="small"
                label={event.level}
                color={
                  event.level === 'error'
                    ? 'error'
                    : event.level === 'warning'
                      ? 'warning'
                      : 'default'
                }
                sx={{ minWidth: 70 }}
              />
              <Typography variant="body2" sx={{ flex: 1 }}>
                {event.message}
              </Typography>
            </Box>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          No events logged yet.
        </Typography>
      )}
    </Paper>
  );
}
