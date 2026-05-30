// ProClaw Cloud 托管版 - 数据导出 API Route
// 支持预设模板和自定义模板导出 JSON / CSV

import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';
import { getTenantSchema, schemaTable } from '@/lib/tenant';
import {
  PRESET_TEMPLATES,
  toCsv,
  generateExportFileName,
  type ExportRequest,
  type ExportResult,
  type ExportField,
} from '@/lib/export';
import { decryptFieldsInArray } from '@/lib/fieldEncryption';
import { getEncryptedFields } from '@/config/encryptedFields';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return '服务器内部错误';
}

/**
 * POST /api/export - 导出数据
 * Body: { templateId: string, format: 'json'|'csv', customTables?: object[], customName?: string }
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const schema = getTenantSchema(session.user.id);
    const body: ExportRequest = await request.json();
    const { templateId, format, customTables, customName } = body;

    if (!templateId) {
      return NextResponse.json({ error: '缺少模板 ID' }, { status: 400 });
    }

    if (!format || !['json', 'csv'].includes(format)) {
      return NextResponse.json({ error: '不支持的导出格式' }, { status: 400 });
    }

    // Token 扣费（数据导出消耗 100 PT）
    const { data: balanceData } = await supabase
      .from('token_balances')
      .select('balance')
      .eq('user_id', session.user.id)
      .single();

    const balance = (balanceData as { balance?: number })?.balance || 0;
    if (balance < 100) {
      return NextResponse.json(
        { error: 'Token 余额不足，需要 100 PT。请前往用户中心充值。', code: 'INSUFFICIENT_TOKENS' },
        { status: 402 }
      );
    }

    // 获取模板
    let tables: { tableName: string; fields: ExportField[] }[];

    if (templateId === 'custom' && customTables) {
      // 自定义模板
      tables = customTables;
    } else {
      // 预设模板
      const template = PRESET_TEMPLATES.find(t => t.id === templateId);
      if (!template) {
        return NextResponse.json({ error: '模板不存在' }, { status: 404 });
      }
      tables = template.tables;
    }

    // 逐表查询数据
    const exportData: Record<string, Record<string, unknown>[]> = {};
    let totalRecords = 0;

    for (const table of tables) {
      const { data: rawData } = await supabase
        .from(schemaTable(schema, table.tableName))
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10000); // 最多 1 万条

      if (rawData && rawData.length > 0) {
        // 解密敏感字段（如果是客户或供应商表）
        let decryptedData = rawData as Record<string, unknown>[];
        if (table.tableName === 'customers') {
          decryptedData = decryptFieldsInArray(decryptedData, [...getEncryptedFields('customers')]);
        } else if (table.tableName === 'suppliers') {
          decryptedData = decryptFieldsInArray(decryptedData, [...getEncryptedFields('suppliers')]);
        }

        exportData[table.tableName] = decryptedData;
        totalRecords += decryptedData.length;
      } else {
        exportData[table.tableName] = [];
      }
    }

    // 构建完整数据集（扁平结构，每个表一个 section）
    const result: Record<string, unknown> = {};
    for (const table of tables) {
      const tableData = exportData[table.tableName] || [];
      // 只保留模板中指定的字段
      const filtered = tableData.map(row => {
        const entry: Record<string, unknown> = {};
        for (const f of table.fields) {
          entry[f.label] = row[f.key];
        }
        return entry;
      });
      result[table.tableName] = filtered;
    }

    // 转换为输出格式
    let output: string;
    const templateName = customName || PRESET_TEMPLATES.find(t => t.id === templateId)?.name || '数据';

    if (format === 'csv') {
      // CSV 格式：每个表单独一个 section，用空行分隔
      const csvParts: string[] = [];
      for (const table of tables) {
        const tableData = exportData[table.tableName] || [];
        if (tableData.length === 0) continue;
        csvParts.push(`# ${table.tableName} (${tableData.length} 条)`);
        csvParts.push(toCsv(tableData, table.fields));
      }
      output = csvParts.join('\n\n');
    } else {
      output = JSON.stringify(result, null, 2);
    }

    // 扣除 Token
    await supabase.rpc('deduct_tokens', {
      p_user_id: session.user.id,
      p_tokens: 100,
    });

    await supabase.from('api_usage_logs').insert({
      user_id: session.user.id,
      resource_type: 'data_export',
      tokens_used: 100,
      endpoint: 'POST /api/export',
      metadata: {
        template_id: templateId,
        format,
        total_records: totalRecords,
        tables: tables.map(t => t.tableName),
      },
    });

    const fileName = generateExportFileName(templateName, format);

    const exportResult: ExportResult = {
      success: true,
      data: output,
      fileName,
      format,
      totalRecords,
    };

    return NextResponse.json(exportResult);
  } catch (error: unknown) {
    console.error('数据导出失败:', error);
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
