import { Box, Typography } from '@mui/material';
import { STEP_LABELS } from './ceoAgentStyles';

interface StepIndicatorProps {
  steps: readonly string[];
  currentStep: string;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  const currentIndex = steps.indexOf(currentStep);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        gap: 1.5,
        py: 1,
        px: 2,
      }}
    >
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = step === currentStep;
        return (
          <Box
            key={step}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
              opacity: isCompleted || isCurrent ? 1 : 0.4,
              transition: 'opacity 0.3s',
            }}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: isCurrent ? '#ff3b30' : isCompleted ? '#4caf50' : 'rgba(255,255,255,0.3)',
                transition: 'all 0.3s',
                boxShadow: isCurrent ? '0 0 8px rgba(255,59,48,0.6)' : 'none',
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: isCurrent ? '#ff3b30' : isCompleted ? '#4caf50' : 'rgba(255,255,255,0.4)',
                fontSize: '0.6rem',
                fontWeight: isCurrent ? 600 : 400,
                whiteSpace: 'nowrap',
              }}
            >
              {STEP_LABELS[step] || step}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
