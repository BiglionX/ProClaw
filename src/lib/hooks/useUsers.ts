import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UsersAndRoles, fetchUsersAndRoles } from '../userManagementService';

export const usersQueryKey = ['users'] as const;

export function useUsersAndRoles() {
  return useQuery<UsersAndRoles>({
    queryKey: usersQueryKey,
    queryFn: fetchUsersAndRoles,
  });
}

export function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: usersQueryKey });
}