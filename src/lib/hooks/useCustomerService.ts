import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CSSettings,
  fetchCSSettings,
  fetchChatHistory,
  fetchKnowledgeBase,
  fetchPendingTransfers,
  replyToTransfer,
  saveCSSettings,
} from '../customerService';

export const customerServiceQueryKey = ['customerService'] as const;

export function usePendingTransfers(page: number) {
  return useQuery({
    queryKey: [...customerServiceQueryKey, 'transfers', page],
    queryFn: () => fetchPendingTransfers(page + 1),
  });
}

export function useChatHistory(page: number, keyword?: string) {
  return useQuery({
    queryKey: [...customerServiceQueryKey, 'history', page, keyword ?? ''],
    queryFn: () => fetchChatHistory(page + 1, keyword),
  });
}

export function useKnowledgeBase(page: number, keyword?: string, category?: string) {
  return useQuery({
    queryKey: [...customerServiceQueryKey, 'kb', page, keyword ?? '', category ?? ''],
    queryFn: () => fetchKnowledgeBase(page + 1, { keyword, category }),
  });
}

export function useCSSettings() {
  return useQuery<CSSettings>({
    queryKey: [...customerServiceQueryKey, 'settings'],
    queryFn: fetchCSSettings,
  });
}

export function useInvalidateCustomerService() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: customerServiceQueryKey });
}

export function useReplyTransfer() {
  const invalidate = useInvalidateCustomerService();
  return useMutation({
    mutationFn: replyToTransfer,
    onSuccess: invalidate,
  });
}

export function useSaveCSSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveCSSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...customerServiceQueryKey, 'settings'] });
    },
  });
}