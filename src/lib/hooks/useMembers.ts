import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Member,
  MemberInput,
  createMember,
  deleteMember,
  getMembers,
  updateMember,
} from '../memberService';

export const membersQueryKey = ['members'] as const;

export function membersListKey(search?: string) {
  return [...membersQueryKey, search ?? ''] as const;
}

export function useMembers(search?: string) {
  return useQuery<Member[]>({
    queryKey: membersListKey(search),
    queryFn: () => getMembers(search),
  });
}

export function useInvalidateMembers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: membersQueryKey });
}

export function useMemberMutations() {
  const invalidate = useInvalidateMembers();

  const create = useMutation({
    mutationFn: (input: MemberInput) => createMember(input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: MemberInput }) => updateMember(id, input),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteMember(id),
    onSuccess: invalidate,
  });

  return { create, update, remove, invalidate };
}