import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Contact,
  Message,
  getAgentGreeting,
  getContacts,
  getMessages,
  sendMessage,
} from '../contactService';

export const chatQueryKey = ['chat'] as const;

export function useChatContact(contactId: string | undefined) {
  return useQuery<Contact | null>({
    queryKey: [...chatQueryKey, 'contact', contactId ?? ''],
    queryFn: async () => {
      if (!contactId) return null;
      const contacts = await getContacts();
      return contacts.find((c) => c.id === contactId) ?? null;
    },
    enabled: !!contactId,
  });
}

export function useChatMessages(contactId: string | undefined) {
  return useQuery<Message[]>({
    queryKey: [...chatQueryKey, 'messages', contactId ?? ''],
    queryFn: async () => {
      if (!contactId) return [];
      let msgs = await getMessages('self', contactId);
      if (msgs.length === 0) {
        const greeting = getAgentGreeting(contactId);
        if (greeting) {
          try {
            const greetingMsg = await sendMessage(
              greeting.fromUser,
              contactId,
              greeting.content,
            );
            greetingMsg.from_user_name = greeting.fromUserName;
            msgs = [greetingMsg];
          } catch (e) {
            console.error('发送 Agent 问候失败:', e);
          }
        }
      }
      return msgs;
    },
    enabled: !!contactId,
  });
}

export function useInvalidateChat() {
  const queryClient = useQueryClient();
  return (contactId?: string) => {
    if (contactId) {
      queryClient.invalidateQueries({ queryKey: [...chatQueryKey, 'messages', contactId] });
      queryClient.invalidateQueries({ queryKey: [...chatQueryKey, 'contact', contactId] });
    } else {
      queryClient.invalidateQueries({ queryKey: chatQueryKey });
    }
  };
}