// ProClaw Shop - 语音消息 API
// 支持语音录制、上传和播放

import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';
import { checkAndDeductToken } from '@/lib/tokenApi';

export const dynamic = 'force-dynamic';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return '服务器内部错误';
}

// 音频文件大小限制 (5MB)
const MAX_AUDIO_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['audio/webm', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'];

/**
 * POST /api/audio - 上传语音消息
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: '未提供音频文件' }, { status: 400 });
    }

    // 检查文件类型
    if (!ALLOWED_TYPES.includes(audioFile.type)) {
      return NextResponse.json(
        { error: '不支持的音频格式，请使用 WebM、WAV、MP3 或 M4A 格式' },
        { status: 400 }
      );
    }

    // 检查文件大小
    if (audioFile.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { error: '音频文件过大，最大支持 5MB' },
        { status: 400 }
      );
    }

    // Token 扣费检查 (语音消息 2 token/条)
    const cost = Math.max(Math.ceil(audioFile.size / (1024 * 1024) * 2), 2);
    const tokenResult = await checkAndDeductToken(
      session.user.id,
      'voice_message',
      1,
      'POST /api/audio'
    );

    if (!tokenResult.success) {
      return NextResponse.json(
        { error: tokenResult.error || 'Token 余额不足' },
        { status: 402 }
      );
    }

    // 上传到 Supabase Storage
    const bucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'tenant-files';
    const ext = audioFile.type.split('/')[1] || 'webm';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const filePath = `${session.user.id}/voice/${timestamp}-${random}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, audioFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: audioFile.type,
      });

    if (uploadError) {
      throw new Error(`上传失败: ${uploadError.message}`);
    }

    // 获取公开 URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      data: {
        url: urlData.publicUrl,
        path: uploadData.path,
        duration: formData.get('duration') || '0',
        size: audioFile.size,
        mimeType: audioFile.type,
      },
      tokensUsed: cost,
    });
  } catch (error: unknown) {
    console.error('语音消息上传失败:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/audio - 删除语音消息
 */
export async function DELETE(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const path = request.nextUrl.searchParams.get('path');
    if (!path) {
      return NextResponse.json({ error: '缺少文件路径' }, { status: 400 });
    }

    // 验证路径属于当前用户
    if (!path.startsWith(session.user.id)) {
      return NextResponse.json({ error: '无权删除此文件' }, { status: 403 });
    }

    const bucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'tenant-files';

    const { error: removeError } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (removeError) {
      throw new Error(`删除失败: ${removeError.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
