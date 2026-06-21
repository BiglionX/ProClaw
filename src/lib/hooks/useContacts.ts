import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Contact, getContacts, getRecentContacts } from '../contactService';

export const contactsQueryKey = ['contacts'] as const;

export function contactsListKey(search?: string) {
  return [...contactsQueryKey, search ?? ''] as const;
}

export function useContacts(search?: string) {
  return useQuery<Contact[]>({
    queryKey: contactsListKey(search),
    queryFn: () => getContacts({ search: search || undefined }),
  });
}

export function useInvalidateContacts() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: contactsQueryKey });
}
export function useRecentContacts(userId: string, enabled = true) {
  return useQuery<Contact[]>({
    queryKey: [...contactsQueryKey, 'recent', userId],
    queryFn: () => getRecentContacts(userId),
    enabled: enabled && !!userId,
  });
}
