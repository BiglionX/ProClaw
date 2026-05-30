import { invoke } from '@tauri-apps/api/core';
import { isTauri } from './tauri';

// ==================== 类型定义 ====================

export interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  contact_type: 'internal' | 'external' | 'team';
  external_type?: 'customer' | 'supplier' | 'both';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // 最近对话信息
  last_message?: string;
  last_message_time?: number;
  last_is_read?: boolean;
  last_from?: string;
  unread_count?: number;
}

export interface Message {
  id: string;
  from_user: string;
  to_user: string;
  content: string;
  content_type: 'text' | 'image' | 'file' | 'order_card';
  is_read: boolean;
  created_at: number;
}

export interface AddContactInput {
  name: string;
  phone?: string;
  email?: string;
  external_type?: 'customer' | 'supplier' | 'both';
}

// ==================== Mock 数据（浏览器模式） ====================

const MOCK_CONTACTS: Contact[] = [
  {
    id: 'ceo-agent', name: 'CEO Agent', phone: '',
    contact_type: 'team', is_active: true,
    created_at: '2026-01-01', updated_at: '2026-05-29',
    last_message: '您好，我是 CEO Agent，有什么可以帮您？', last_message_time: Date.now() - 600000,
    last_is_read: false, last_from: 'ceo-agent', unread_count: 1,
  },
  {
    id: '1', name: '张三 (客户)', phone: '13800138001', email: 'zhangsan@email.com',
    contact_type: 'external', external_type: 'customer', is_active: true,
    created_at: '2026-01-15', updated_at: '2026-05-20',
    last_message: '老板，这批发货什么时候到？', last_message_time: Date.now() - 3600000,
    last_is_read: false, last_from: '1', unread_count: 2,
  },
  {
    id: '2', name: '李四 (供应商)', phone: '13900139002', email: 'lisi@supplier.com',
    contact_type: 'external', external_type: 'supplier', is_active: true,
    created_at: '2026-02-10', updated_at: '2026-05-18',
    last_message: '好的，明天安排发货', last_message_time: Date.now() - 86400000,
    last_is_read: true, last_from: 'self', unread_count: 0,
  },
  {
    id: '3', name: '王五 (客户)', phone: '13700137003', email: 'wangwu@email.com',
    contact_type: 'external', external_type: 'customer', is_active: true,
    created_at: '2026-03-01', updated_at: '2026-05-15',
    last_message: '收到货了，质量不错', last_message_time: Date.now() - 172800000,
    last_is_read: true, last_from: '3', unread_count: 0,
  },
  {
    id: '4', name: '小刘 (销售员)', phone: '13600136004', email: 'xiaoliu@proclaw.com',
    contact_type: 'team', external_type: undefined, is_active: true,
    created_at: '2026-01-01', updated_at: '2026-05-22',
    last_message: '今天新签了一个大客户', last_message_time: Date.now() - 7200000,
    last_is_read: false, last_from: '4', unread_count: 3,
  },
  {
    id: '5', name: '赵六 (同行调货)', phone: '13500135005', email: 'zhaoliu@email.com',
    contact_type: 'external', external_type: 'customer', is_active: true,
    created_at: '2026-04-01', updated_at: '2026-05-10',
    last_message: '老王，你那边还有XX型号库存吗？', last_message_time: Date.now() - 259200000,
    last_is_read: true, last_from: '5', unread_count: 0,
  },
  {
    id: '6', name: '钱七 (供应商)', phone: '13400134006', email: 'qianqi@factory.com',
    contact_type: 'external', external_type: 'supplier', is_active: false,
    created_at: '2026-01-20', updated_at: '2026-05-01',
  },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  '1': [
    { id: 'm1', from_user: '1', to_user: 'self', content: '老板你好，我要下单50箱矿泉水', content_type: 'text', is_read: true, created_at: Date.now() - 7200000 },
    { id: 'm2', from_user: 'self', to_user: '1', content: '好的，你的订单收到了，下午发货', content_type: 'text', is_read: true, created_at: Date.now() - 7100000 },
    { id: 'm3', from_user: '1', to_user: 'self', content: '太好了，谢谢老板', content_type: 'text', is_read: true, created_at: Date.now() - 7000000 },
    { id: 'm4', from_user: '1', to_user: 'self', content: '老板，这批发货什么时候到？', content_type: 'text', is_read: false, created_at: Date.now() - 3600000 },
    { id: 'm5', from_user: '1', to_user: 'self', content: '我这边客户催得紧', content_type: 'text', is_read: false, created_at: Date.now() - 3500000 },
  ],
  '2': [
    { id: 'm6', from_user: 'self', to_user: '2', content: '李总，我需要补一批包装袋', content_type: 'text', is_read: true, created_at: Date.now() - 172800000 },
    { id: 'm7', from_user: '2', to_user: 'self', content: 'OK，要多少？', content_type: 'text', is_read: true, created_at: Date.now() - 170000000 },
    { id: 'm8', from_user: 'self', to_user: '2', content: '先来5000个吧', content_type: 'text', is_read: true, created_at: Date.now() - 168000000 },
    { id: 'm9', from_user: '2', to_user: 'self', content: '好的，明天安排发货', content_type: 'text', is_read: true, created_at: Date.now() - 86400000 },
  ],
  '3': [
    { id: 'm10', from_user: '3', to_user: 'self', content: '老板，上次那批货收到了', content_type: 'text', is_read: true, created_at: Date.now() - 259200000 },
    { id: 'm11', from_user: 'self', to_user: '3', content: '好的，有什么问题随时联系', content_type: 'text', is_read: true, created_at: Date.now() - 258000000 },
    { id: 'm12', from_user: '3', to_user: 'self', content: '收到货了，质量不错', content_type: 'text', is_read: true, created_at: Date.now() - 172800000 },
  ],
  '4': [
    { id: 'm13', from_user: '4', to_user: 'self', content: '老板，今天有个新客户想谈长期合作', content_type: 'text', is_read: false, created_at: Date.now() - 10800000 },
    { id: 'm14', from_user: 'self', to_user: '4', content: '好的，你把客户信息发我看看', content_type: 'text', is_read: true, created_at: Date.now() - 10000000 },
    { id: 'm15', from_user: '4', to_user: 'self', content: '已经发你邮箱了', content_type: 'text', is_read: false, created_at: Date.now() - 9600000 },
    { id: 'm16', from_user: '4', to_user: 'self', content: '今天新签了一个大客户', content_type: 'text', is_read: false, created_at: Date.now() - 7200000 },
  ],
  '5': [
    { id: 'm17', from_user: '5', to_user: 'self', content: '老王，你那边还有XX型号库存吗？', content_type: 'text', is_read: true, created_at: Date.now() - 259200000 },
    { id: 'm18', from_user: 'self', to_user: '5', content: '有的，你要多少？', content_type: 'text', is_read: true, created_at: Date.now() - 258000000 },
  ],
};

// ==================== API 方法 ====================

/** 获取所有联系人 */
export async function getContacts(options?: { search?: string; current_user_id?: string }): Promise<Contact[]> {
  if (!isTauri()) {
    let contacts = [...MOCK_CONTACTS];
    if (options?.search) {
      const s = options.search.toLowerCase();
      contacts = contacts.filter(c => c.name.toLowerCase().includes(s) || c.phone?.includes(s));
    }
    return contacts;
  }
  const res: any = await invoke('get_contacts', { options: options || null });
  return res?.data || [];
}

/** 获取最近联系人（带消息预览） */
export async function getRecentContacts(currentUserId: string): Promise<Contact[]> {
  if (!isTauri()) {
    return MOCK_CONTACTS.filter(c => c.last_message).sort((a, b) => (b.last_message_time || 0) - (a.last_message_time || 0));
  }
  const res: any = await invoke('get_recent_contacts', { user_id: currentUserId });
  return res?.data || [];
}

/** 获取两个用户之间的消息 */
export async function getMessages(fromUser: string, toUser: string, limit = 50): Promise<Message[]> {
  if (!isTauri()) {
    return MOCK_MESSAGES[toUser] || MOCK_MESSAGES[fromUser] || [];
  }
  const res: any = await invoke('get_messages', { from_user: fromUser, to_user: toUser, limit });
  return res?.data || [];
}

/** 发送消息 */
export async function sendMessage(fromUser: string, toUser: string, content: string, contentType = 'text'): Promise<Message> {
  if (!isTauri()) {
    const newMsg: Message = {
      id: `mock-${Date.now()}`,
      from_user: fromUser,
      to_user: toUser,
      content,
      content_type: contentType as any,
      is_read: false,
      created_at: Date.now(),
    };
    // 追加到 mock 数据
    if (!MOCK_MESSAGES[toUser]) MOCK_MESSAGES[toUser] = [];
    MOCK_MESSAGES[toUser].push(newMsg);
    return newMsg;
  }
  return await invoke('send_message', {
    message: { from_user: fromUser, to_user: toUser, content, content_type: contentType }
  });
}

/** 标记消息已读 */
export async function markMessageRead(messageId: string): Promise<void> {
  if (!isTauri()) return;
  await invoke('mark_message_read', { message_id: messageId });
}

/** 标记整个对话已读 */
export async function markConversationRead(fromUser: string, toUser: string): Promise<void> {
  if (!isTauri()) return;
  await invoke('mark_conversation_read', { from_user: fromUser, to_user: toUser });
}

/** 添加联系人 */
export async function addContact(input: AddContactInput): Promise<Contact> {
  if (!isTauri()) {
    const newContact: Contact = {
      id: `mock-${Date.now()}`,
      name: input.name,
      phone: input.phone,
      email: input.email,
      contact_type: 'external',
      external_type: input.external_type || 'customer',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    MOCK_CONTACTS.push(newContact);
    return newContact;
  }
  return await invoke('add_contact', { contact: input });
}

/** 获取未读消息数 */
export async function getUnreadCount(userId: string): Promise<number> {
  if (!isTauri()) {
    return MOCK_CONTACTS.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  }
  const res: any = await invoke('get_unread_count', { user_id: userId });
  return res?.count || 0;
}
