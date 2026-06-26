/**
 * Step 6: 摘要确认
 *
 * 展示即将执行的：文件名、总行数、字段映射数、冲突策略等
 */

import { Alert, Box, Chip, Divider, Paper, Stack, Typography } from '@mui/material';

import type { ConflictStrategy, FieldMapping, ParsedFile } from '../../lib/importers/types';

export interface Step6Props {
  parsed: ParsedFile;
  mapping: FieldMapping[];
  conflictStrategy: ConflictStrategy;
  errorCount: number;
}

export function Step6Confirm({ parsed, mapping, conflictStrategy, errorCount }: Step6Props) {
  const strategy = {
    skip: '跳过已存在',
    overwrite: '覆盖已存在',
    duplicate: '创建副本',
  }[conflictStrategy];

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        导入摘要
      </Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Row label="文件名" value={parsed.fileName} />
          <Row label="文件类型" value={parsed.fileType.toUpperCase()} />
          <Row label="Sheet" value={parsed.sheetNames.join(', ')} />
          <Row label="数据行数" value={parsed.rows.length.toString()} />
          <Row
            label="已映射字段"
            value={`${mapping.length} 个（${mapping.map((m) => m.targetField).join(', ')}）`}
          />
          <Row label="冲突策略" value={strategy} />
          {errorCount > 0 && (
            <Row
              label="校验错误"
              value={
                <Chip label={`${errorCount} 个`} color={errorCount > 0 ? 'warning' : 'success'} size="small" />
              }
            />
          )}
        </Stack>
      </Paper>

      <Divider sx={{ my: 2 }} />

      <Alert severity="info">
        点击 <strong>开始导入</strong> 将执行：写入 SPU / SKU / 图片，自动建分类与品牌。 整个过程在事务内完成，失败会自动回滚。
      </Alert>
    </Box>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" alignItems="center" spacing={2}>
      <Typography variant="body2" color="text.secondary" sx={{ width: 100 }}>
        {label}
      </Typography>
      <Box sx={{ flex: 1, fontFamily: typeof value === 'string' ? 'inherit' : 'inherit' }}>{value}</Box>
    </Stack>
  );
}