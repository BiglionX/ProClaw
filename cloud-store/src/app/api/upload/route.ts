// ProClaw Cloud 托管版 - 文件上传 API Routes
// 支持 multipart/form-data 文件上传

import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';
import { getTenantSchema, schemaTable } from '@/lib/tenant';
import { checkAndDeductToken } from '@/lib/tokenApi';

export const dynamic = 'force-dynamic';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return '服务器内部错误';
}

/**
 * POST /api/upload - 上传文件
 * 接收 multipart/form-data, 上传到 Supabase Storage
 */
export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.next();
    const supabase = createRouteSupabaseClient(request, response);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '未提供文件' }, { status: 400 });
    }

    // 检查文件大小 (限制 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '文件大小超过限制 (最大 10MB)' },
        { status: 400 }
      );
    }

    // 检查文件类型
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf', 'text/plain', 'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '不支持的文件类型' },
        { status: 400 }
      );
    }

    // Token 扣费检查 (10 token/MB)
    const cost = Math.max(Math.ceil(file.size / (1024 * 1024) * 10), 10);
    const tokenResult = await checkAndDeductToken(
      session.user.id,
      'file_upload',
      Math.ceil(file.size / (1024 * 1024)),
      'POST /api/upload'
    );
    if (!tokenResult.success) {
      return NextResponse.json(
        { error: tokenResult.error || 'Token 余额不足' },
        { status: 402 }
      );
    }

    // 上传到 Supabase Storage
    const bucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'tenant-files';
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const filePath = `${session.user.id}/${timestamp}-${random}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      throw new Error(`上传失败: ${uploadError.message}`);
    }

    // 获取公开 URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    // 记录文件元数据到 tenant schema
    const schema = getTenantSchema(session.user.id);
    await supabase
      .from(schemaTable(schema, 'files'))
      .insert({
        user_id: session.user.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        public_url: urlData.publicUrl,
        created_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      data: {
        url: urlData.publicUrl,
        path: uploadData.path,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        tokensUsed: cost,
      },
    });
  } catch (error: unknown) {
    console.error('文件上传失败:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/upload - 获取已上传文件列表
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const schema = getTenantSchema(session.user.id);
    const bucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'tenant-files';
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // 优先从数据库获取文件记录
    const { data: records, error, count } = await supabase
      .from(schemaTable(schema, 'files'))
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      // 如果 files 表不存在，从 Storage 直接列出
      const { data: storageList } = await supabase.storage
        .from(bucket)
        .list(session.user.id, {
          sortBy: { column: 'created_at', order: 'desc' },
          limit: pageSize,
          offset: from,
        });

      const files = (storageList || []).map(item => {
        const path = `${session.user.id}/${item.name}`;
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
        return {
          name: item.name,
          path,
          url: urlData.publicUrl,
          size: (item as { metadata?: { size?: number } }).metadata?.size || 0,
          created_at: item.created_at || '',
        };
      });

      return NextResponse.json({ data: files, total: files.length });
    }

    const files = (records || []).map(r => ({
      name: r.file_name,
      path: r.file_path,
      url: r.public_url,
      size: r.file_size,
      created_at: r.created_at,
    }));

    return NextResponse.json({ data: files, total: count || 0 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

/**
 * DELETE /api/upload - 删除文件
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

    const bucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'tenant-files';

    const { error: removeError } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (removeError) {
      throw new Error(`删除失败: ${removeError.message}`);
    }

    // 同时删除数据库记录
    const schema = getTenantSchema(session.user.id);
    await supabase
      .from(schemaTable(schema, 'files'))
      .delete()
      .eq('file_path', path);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
