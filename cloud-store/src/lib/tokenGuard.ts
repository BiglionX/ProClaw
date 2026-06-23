// 云商城 Token 中间件 API Route 封装
// 在商品同步、订单创建、主题生成等关键操作前检查并扣除 Token

import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';
import { getTokenBalance, getDebtStatus, checkDailyLimit } from '@/lib/tokenApi';

// PRD §5 计费标准
const PT_COST = {
  api_write: 1,           // 业务 API 请求（增删改查）
  api_read: 1,            // 业务 API 请求（读取，PRD 统一 1 token）
  chat_message: 1,        // 聊天消息（发送/接收）
  websocket_hour: 5,      // WebSocket 长连接（1 小时）
  file_upload_mb: 10,     // 文件上传（每 1 MB）
  ai_image_recognition: 5, // AI 识别图片（每次）
  storage_gb_month: 100,  // 存储空间（每 GB·月）
  // 保留旧 key 以兼容现有代码
  product_sync: 1,
  ai_theme: 5000,
  order_process: 1,
};

// ========== 欠费保护状态码 ==========

const DEBT_STATUS_RESPONSES: Record<string, { status: number; error: string; code: string }> = {
  readonly: {
    status: 403,
    error: '您的账户处于只读模式（余额耗尽第4~7天），请充值后恢复写操作',
    code: 'DEBT_READONLY',
  },
  suspended: {
    status: 403,
    error: '您的账户已暂停服务（余额耗尽超过7天），请立即充值恢复',
    code: 'DEBT_SUSPENDED',
  },
  archived: {
    status: 403,
    error: '您的账户数据已归档（余额耗尽超过30天），请联系管理员恢复',
    code: 'DEBT_ARCHIVED',
  },
};

// ========== Token 保护装饰器 ==========

interface TokenGuardOptions {
  resourceType: string;
  quantity?: number;
  costPerUnit?: number;
}

interface TokenGuardResult {
  allowed: boolean;
  error?: string;
  cost?: number;
  debtStatus?: string;
  dailyRemaining?: number;
}

/**
 * Token 保护：在执行操作前检查余额并扣费
 * 增强版：增加欠费保护检查和日消耗上限检查
 */
export async function tokenGuard(
  userId: string,
  options: TokenGuardOptions
): Promise<TokenGuardResult> {
  const quantity = options.quantity || 1;
  const ptPerUnit = options.costPerUnit || PT_COST[options.resourceType as keyof typeof PT_COST] || 0;
  const totalCost = ptPerUnit * quantity;

  if (totalCost <= 0) {
    return { allowed: true, cost: 0 };
  }

  // Step 1: 检查欠费状态
  const debtStatus = await getDebtStatus(userId);
  if (debtStatus) {
    if (debtStatus.status === 'suspended' || debtStatus.status === 'archived') {
      const resp = DEBT_STATUS_RESPONSES[debtStatus.status];
      return {
        allowed: false,
        error: resp.error,
        cost: totalCost,
        debtStatus: debtStatus.status,
      };
    }
    if (debtStatus.status === 'readonly') {
      // 只读模式：检查是否为读操作
      // resourceType 以 'api_read' 或查询操作为读
      if (options.resourceType !== 'api_read') {
        const resp = DEBT_STATUS_RESPONSES['readonly'];
        return {
          allowed: false,
          error: resp.error,
          cost: totalCost,
          debtStatus: 'readonly',
        };
      }
    }
  }

  // Step 2: 检查日消耗上限
  const dailyCheck = await checkDailyLimit(userId, totalCost);
  if (dailyCheck && !dailyCheck.allowed) {
    return {
      allowed: false,
      error: `今日 Token 消耗已达上限（${dailyCheck.daily_limit.toLocaleString()} PT）。如需调整，请前往用户中心设置。`,
      cost: totalCost,
      dailyRemaining: dailyCheck.remaining,
    };
  }

  // Step 3: 检查余额
  const balance = await getTokenBalance(userId);
  if (balance < totalCost) {
    return {
      allowed: false,
      error: `Token 余额不足。需要 ${totalCost.toLocaleString()} PT，当前余额 ${balance.toLocaleString()} PT。请前往用户中心充值。`,
      cost: totalCost,
    };
  }

  return { allowed: true, cost: totalCost, debtStatus: debtStatus?.status, dailyRemaining: dailyCheck?.remaining };
}

// ========== 中间件辅助函数 ==========

/**
 * 从认证会话中获取用户 ID（安全的获取方式）
 * 优先从已验证的 session 获取，永不信任客户端 header
 */
export async function getUserIdFromSession(
  request: NextRequest
): Promise<string | null> {
  try {
    const response = NextResponse.next();
    const supabase = createRouteSupabaseClient(request, response);
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) {
      return null;
    }
    return session.user.id;
  } catch {
    return null;
  }
}

/**
 * 从请求中提取用户 ID（仅用于日志/调试）
 * 注意：此函数返回的值不应直接用于授权决策
 */
export function getUserIdHintFromRequest(request: NextRequest): string | null {
  // 仅从 cookie 获取提示信息（server-side cookie 相对安全）
  const cookieUserId = request.cookies.get('user_id')?.value;
  if (cookieUserId && /^[a-zA-Z0-9-]{8,64}$/.test(cookieUserId)) {
    return cookieUserId;
  }
  return null;
}

/**
 * 处理 Token 检查失败响应
 */
export function tokenInsufficientResponse(error: string): NextResponse {
  return NextResponse.json(
    {
      error,
      code: 'INSUFFICIENT_TOKENS',
      message: 'Token 余额不足，请充值后重试',
      payment_url: '/user-center?tab=4', // 跳转到充值页面
    },
    { status: 402 }
  );
}

/**
 * 处理未授权响应
 */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: '未登录，无法执行计费操作', code: 'UNAUTHORIZED' },
    { status: 401 }
  );
}
