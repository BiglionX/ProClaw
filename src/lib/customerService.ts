export interface TransferItem {
  id: string;
  session_id: string;
  customer_id: string;
  customer_name: string | null;
  question: string;
  transfer_reason: string;
  transfer_mode: string;
  status: string;
  created_at: string;
}

export interface ChatLogItem {
  id: string;
  session_id: string;
  customer_id: string;
  customer_name: string | null;
  question: string;
  answer: string;
  answer_source: string;
  is_transferred: boolean;
  created_at: string;
}

export interface KBItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CSSettings {
  is_enabled: boolean;
  auto_greeting: string;
  transfer_mode: 'direct' | 'ai_judged';
  avatar_url: string | null;
  agent_name: string;
  system_prompt: string;
}

export const DEFAULT_CS_SETTINGS: CSSettings = {
  is_enabled: true,
  auto_greeting: '您好，我是客服小如，请问有什么可以帮您？',
  transfer_mode: 'direct',
  avatar_url: null,
  agent_name: '智能客服',
  system_prompt: '',
};

interface Paginated<T> {
  data: T[];
  total: number;
}

async function parseJson<T>(res: Response): Promise<T | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchPendingTransfers(page: number, pageSize = 20): Promise<Paginated<TransferItem>> {
  try {
    const res = await fetch(`/api/customer-service/transfers?status=pending&page=${page}&page_size=${pageSize}`);
    const result = await parseJson<{ success?: boolean; data?: TransferItem[]; total?: number }>(res);
    if (result?.success) {
      return { data: result.data ?? [], total: result.total ?? 0 };
    }
  } catch {
    // desktop may not reach cloud API
  }
  return { data: [], total: 0 };
}

export async function replyToTransfer(payload: {
  transfer_id: string;
  answer: string;
  save_to_kb: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const res = await fetch('/api/customer-service/transfers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await parseJson<{ success?: boolean; error?: string }>(res);
  return { success: !!result?.success, error: result?.error };
}

export async function fetchChatHistory(
  page: number,
  keyword?: string,
  pageSize = 20,
): Promise<Paginated<ChatLogItem>> {
  try {
    let url = `/api/customer-service/history?page=${page}&page_size=${pageSize}`;
    if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
    const res = await fetch(url);
    const result = await parseJson<{ success?: boolean; data?: ChatLogItem[]; total?: number }>(res);
    if (result?.success) {
      return { data: result.data ?? [], total: result.total ?? 0 };
    }
  } catch {
    // ignore
  }
  return { data: [], total: 0 };
}

export async function fetchKnowledgeBase(
  page: number,
  options?: { keyword?: string; category?: string },
  pageSize = 20,
): Promise<Paginated<KBItem>> {
  try {
    let url = `/api/customer-service/knowledge-base?page=${page}&page_size=${pageSize}`;
    if (options?.keyword) url += `&keyword=${encodeURIComponent(options.keyword)}`;
    if (options?.category) url += `&category=${options.category}`;
    const res = await fetch(url);
    const result = await parseJson<{ success?: boolean; data?: KBItem[]; total?: number }>(res);
    if (result?.success) {
      return { data: result.data ?? [], total: result.total ?? 0 };
    }
  } catch {
    // ignore
  }
  return { data: [], total: 0 };
}

export async function saveKnowledgeBaseItem(
  payload: Record<string, unknown>,
  method: 'POST' | 'PUT',
): Promise<{ success: boolean; error?: string }> {
  const url = method === 'POST'
    ? '/api/customer-service/knowledge-base'
    : '/api/customer-service/knowledge-base';
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await parseJson<{ success?: boolean; error?: string }>(res);
  return { success: !!result?.success, error: result?.error };
}

export async function deleteKnowledgeBaseItem(id: string): Promise<boolean> {
  const res = await fetch(`/api/customer-service/knowledge-base?id=${id}`, { method: 'DELETE' });
  const result = await parseJson<{ success?: boolean }>(res);
  return !!result?.success;
}

export async function fetchCSSettings(): Promise<CSSettings> {
  try {
    const res = await fetch('/api/customer-service/settings');
    const result = await parseJson<{ success?: boolean; data?: Partial<CSSettings> }>(res);
    if (result?.success && result.data) {
      return {
        is_enabled: result.data.is_enabled ?? DEFAULT_CS_SETTINGS.is_enabled,
        auto_greeting: result.data.auto_greeting || DEFAULT_CS_SETTINGS.auto_greeting,
        transfer_mode: result.data.transfer_mode || DEFAULT_CS_SETTINGS.transfer_mode,
        avatar_url: result.data.avatar_url ?? null,
        agent_name: result.data.agent_name || DEFAULT_CS_SETTINGS.agent_name,
        system_prompt: result.data.system_prompt || DEFAULT_CS_SETTINGS.system_prompt,
      };
    }
  } catch {
    // use defaults
  }
  return DEFAULT_CS_SETTINGS;
}

export async function saveCSSettings(settings: CSSettings): Promise<{ success: boolean; error?: string }> {
  const res = await fetch('/api/customer-service/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  const result = await parseJson<{ success?: boolean; error?: string }>(res);
  return { success: !!result?.success, error: result?.error };
}