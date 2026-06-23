import { Chip, Stack, Typography } from '@mui/material';

/**
 * Job Status Header showing job ID, type, and status.
 *
 * @param {object} props - Component props.
 * @param {object|null} props.jobDetails - Job details object.
 * @returns {import('react').JSX.Element} Job Status Header.
 */
export default function JobStatusHeader({ jobDetails }) {
  if (!jobDetails) {
    return <Typography variant="h6">Job Progress</Typography>;
  }

  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Typography variant="h6">Job Progress</Typography>
      <Chip size="small" label={`#${jobDetails.id}`} variant="outlined" />
      <Chip size="small" label={jobDetails.type || 'unknown'} color="secondary" />
      <Chip
        size="small"
        label={jobDetails.status || 'unknown'}
        color={
          jobDetails.status === 'succeeded'
            ? 'success'
            : jobDetails.status === 'failed'
              ? 'error'
              : jobDetails.status === 'running'
                ? 'info'
                : 'default'
        }
      />
    </Stack>
  );
}
