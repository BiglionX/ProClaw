import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AIConfig, getAIConfig } from '../aiConfig';
import { getDatabaseStats } from '../syncService';

export const settingsQueryKey = ['settings'] as const;

export function useAIConfigSettings(enabled = true) {
  return useQuery<AIConfig>({
    queryKey: [...settingsQueryKey, 'aiConfig'],
    queryFn: getAIConfig,
    enabled,
  });
}

export function useDatabaseStatsSettings(enabled = true) {
  return useQuery({
    queryKey: [...settingsQueryKey, 'dbStats'],
    queryFn: getDatabaseStats,
    enabled,
  });
}

export function useInvalidateSettings() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: settingsQueryKey });
}