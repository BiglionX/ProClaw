import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Device,
  SubscriptionBundle,
  UserProfile,
  fetchSubscriptionBundle,
  fetchUserDevices,
  fetchUserProfile,
} from '../userCenterService';

export const userCenterQueryKey = ['userCenter'] as const;

export function useUserProfile(
  userId: string,
  fallback?: { email?: string; created_at?: string },
  enabled = true,
) {
  return useQuery<UserProfile>({
    queryKey: [...userCenterQueryKey, 'profile', userId],
    queryFn: () => fetchUserProfile(userId, fallback),
    enabled: enabled && !!userId,
  });
}

export function useUserDevices(userId: string, enabled = true) {
  return useQuery<Device[]>({
    queryKey: [...userCenterQueryKey, 'devices', userId],
    queryFn: () => fetchUserDevices(userId),
    enabled: enabled && !!userId,
  });
}

export function useSubscriptionBundle(userId: string, enabled = true) {
  return useQuery<SubscriptionBundle>({
    queryKey: [...userCenterQueryKey, 'subscription', userId],
    queryFn: () => fetchSubscriptionBundle(userId),
    enabled: enabled && !!userId,
  });
}

export function useInvalidateUserCenter() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: userCenterQueryKey });
}