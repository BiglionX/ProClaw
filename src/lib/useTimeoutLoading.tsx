import { Box, Button, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * 加载态持续超过 timeoutMs 后标记超时。数据到达（loading 变 false）时清掉计时器。
 * retry() 在仍处于加载态时重新计时。
 */
export function useTimeoutLoading(loading: boolean, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const [timedOut, setTimedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!loading) {
      setTimedOut(false);
      return;
    }
    setTimedOut(false);
    const timer = window.setTimeout(() => setTimedOut(true), timeoutMs);
    return () => window.clearTimeout(timer);
  }, [loading, timeoutMs, attempt]);

  return {
    timedOut: loading && timedOut,
    retry: () => setAttempt((n) => n + 1),
  };
}

export function LoadTimeoutNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Typography sx={{ mb: 2 }}>加载超时，请重试</Typography>
      <Button variant="contained" onClick={onRetry}>
        重试
      </Button>
    </Box>
  );
}
