import apiClient from './apiClient';

export interface Member {
  id: string;
  name: string;
  code: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  customer_type: 'individual' | 'vip' | 'enterprise';
  tax_number?: string;
  credit_limit: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MemberInput {
  name: string;
  code?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  customer_type: 'individual' | 'vip' | 'enterprise';
  credit_limit: number;
  notes?: string;
  is_active: boolean;
}

export async function getMembers(search?: string): Promise<Member[]> {
  const response = await apiClient.get<{ data: Member[]; total: number }>(
    '/api/customers',
    { params: { search: search || undefined } },
  );
  return Array.isArray(response?.data) ? response.data : [];
}

export async function createMember(input: MemberInput): Promise<void> {
  await apiClient.post('/api/customers', input);
}

export async function updateMember(id: string, input: MemberInput): Promise<void> {
  await apiClient.put(`/api/customers/${id}`, input);
}

export async function deleteMember(id: string): Promise<void> {
  await apiClient.delete(`/api/customers/${id}`);
}