// API Route: 商品同步 - Token 计费检查示例
import { NextRequest, NextResponse } from 'next/server';
import { tokenGuard, getUserIdFromSession, tokenInsufficientResponse, unauthorizedResponse } from '@/lib/tokenGuard';
import { checkAndDeductToken } from '@/lib/tokenApi';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sync
 * 同步商品到商城，同步前检查并扣除 Token
 */
export async function POST(request: NextRequest) {
  // 从认证会话获取用户 ID（安全方式）
  const userId = await getUserIdFromSession(request);
  if (!userId) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const productCount = body.product_ids?.length || 1;

    // Token 守卫检查
    const guard = await tokenGuard(userId, {
      resourceType: 'product_sync',
      quantity: productCount,
      costPerUnit: 50,
    });

    if (!guard.allowed) {
      return tokenInsufficientResponse(guard.error!);
    }

    // 扣除 Token
    const result = await checkAndDeductToken(
      userId,
      'product_sync',
      productCount,
      '/api/sync',
      { product_ids: body.product_ids }
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Token 扣费失败' },
        { status: 402 }
      );
    }

    // TODO: 执行实际商品同步逻辑
    // ...

    return NextResponse.json({
      success: true,
      message: `同步成功，消耗 ${guard.cost} PT`,
      token_cost: guard.cost,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : '同步失败';
    console.error('商品同步失败:', errMsg);
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}
