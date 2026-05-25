// 邀请服务 (PRD v4.2)
// 移动端邀请相关 API 调用

export interface AcceptInvitationRequest {
  invite_code: string;
  new_user: {
    phone?: string;
    name: string;
    password?: string;
  };
}

export interface AcceptInvitationResponse {
  success: boolean;
  message: string;
  user_id?: string;
  token?: string;
}

const API_BASE_URL = 'http://localhost:8888';

/**
 * 接受邀请
 */
export async function acceptInvitation(
  host: string,
  request: AcceptInvitationRequest
): Promise<AcceptInvitationResponse> {
  const url = `${host}/api/invitations/accept`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '接受邀请失败');
    }

    return await response.json();
  } catch (error) {
    console.error('接受邀请失败:', error);
    throw error;
  }
}

/**
 * 解析深度链接
 */
export function parseInviteLink(url: string): {
  invite_code?: string;
  host?: string;
} {
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    
    return {
      invite_code: params.get('code') || undefined,
      host: params.get('host') || undefined,
    };
  } catch {
    // 如果不是完整 URL，尝试解析 proclaw:// 协议
    const match = url.match(/proclaw:\/\/invite\?code=([^&]+)(?:&host=([^&]+))?/);
    if (match) {
      return {
        invite_code: match[1],
        host: match[2] ? decodeURIComponent(match[2]) : undefined,
      };
    }
    return {};
  }
}
