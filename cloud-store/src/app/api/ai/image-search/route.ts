// ProClaw Shop - AI 智能找图 API
// 从 Pexels/Pixabay 免费图库搜索商品图片

import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/multi-tenant';
import { TokenCalculator, TokenActions } from '@/lib/token-calculator';

export const dynamic = 'force-dynamic';

interface ImageResult {
  id: string;
  url: string;
  thumbnail_url: string;
  width: number;
  height: number;
  source: 'pexels' | 'pixabay' | 'placeholder';
  photographer?: string;
  photographer_url?: string;
}

/**
 * 搜索图片
 * POST /api/ai/image-search
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyword, count = 10 } = body;
    
    if (!keyword || keyword.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: '关键词长度至少2个字符' },
        { status: 400 }
      );
    }
    
    const tenantContext = await getTenantContext();
    
    if (!tenantContext.tenantId) {
      return NextResponse.json(
        { success: false, error: '未获取到租户信息' },
        { status: 400 }
      );
    }
    
    // 扣 Token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const tokenCalc = new TokenCalculator(supabaseUrl, supabaseKey);
    const consumeResult = await tokenCalc.consume({
      tenant_id: tenantContext.tenantId,
      action: TokenActions.AI_IMAGE_SEARCH,
      quantity: 1,
    });
    
    if (!consumeResult.success) {
      return NextResponse.json(
        { success: false, error: consumeResult.error || 'Token 不足' },
        { status: 402 }
      );
    }
    
    // 调用免费图库 API (Pexels)
    const images: ImageResult[] = [];
    
    try {
      const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
      
      if (PEXELS_API_KEY) {
        const response = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword)}&per_page=${count}`,
          {
            headers: {
              Authorization: PEXELS_API_KEY,
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          
          for (const photo of data.photos || []) {
            images.push({
              id: `pexels_${photo.id}`,
              url: photo.src.large,
              thumbnail_url: photo.src.tiny,
              width: photo.width,
              height: photo.height,
              source: 'pexels',
              photographer: photo.photographer,
              photographer_url: photo.photographer_url,
            });
          }
        }
      }
    } catch (error) {
      console.error('Pexels API error:', error);
    }
    
    // 如果没有结果，生成占位图
    if (images.length === 0) {
      for (let i = 0; i < count; i++) {
        images.push({
          id: `placeholder_${i}`,
          url: `https://via.placeholder.com/800x600/3B82F6/FFFFFF?text=${encodeURIComponent(keyword)}`,
          thumbnail_url: `https://via.placeholder.com/200x200/3B82F6/FFFFFF?text=${encodeURIComponent(keyword)}`,
          width: 800,
          height: 600,
          source: 'placeholder',
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        images,
        tokens_consumed: consumeResult.tokens_consumed,
      },
    });
  } catch (error) {
    console.error('Image search error:', error);
    return NextResponse.json(
      { success: false, error: '图片搜索失败' },
      { status: 500 }
    );
  }
}
