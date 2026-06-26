/**
 * Step 2: 选择导入目标
 * v1.2 P1：扩展支持 6 种目标（商品库/库存/采购/销售/供应商/客户）
 */

import { Box, Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material';

import type { ImportTarget } from '../../lib/importers/types';

export interface Step2Props {
  value: ImportTarget;
  onChange: (target: ImportTarget) => void;
}

const TARGETS: { value: ImportTarget; label: string; desc: string; icon: string }[] = [
  { value: 'products', label: '商品库', desc: '导入 SPU + SKU + 图片', icon: '📦' },
  { value: 'inventory', label: '库存交易', desc: '导入期初库存 + 出入库记录', icon: '📊' },
  { value: 'purchases', label: '采购订单', desc: '导入采购单 + 自动建供应商', icon: '🛒' },
  { value: 'sales', label: '销售订单', desc: '导入销售单 + 自动建客户', icon: '💰' },
  { value: 'suppliers', label: '供应商', desc: '导入供应商主数据', icon: '🏭' },
  { value: 'customers', label: '客户', desc: '导入客户主数据', icon: '👥' },
];

export function Step2TargetSelect({ value, onChange }: Step2Props) {
  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        选择导入目标
      </Typography>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        {TARGETS.map((t) => (
          <Card
            key={t.value}
            variant={value === t.value ? 'elevation' : 'outlined'}
            sx={{
              flex: '1 1 200px',
              minWidth: 180,
              maxWidth: 280,
              borderColor: value === t.value ? 'primary.main' : 'divider',
              borderWidth: value === t.value ? 2 : 1,
            }}
          >
            <CardActionArea onClick={() => onChange(t.value)} data-testid={`target-${t.value}`}>
              <CardContent>
                <Typography variant="h2" sx={{ mb: 1 }}>
                  {t.icon}
                </Typography>
                <Typography variant="h6">{t.label}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t.desc}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        提示：库存/采购/销售导入时，供应商与客户字段将按名称自动创建主数据。
      </Typography>
    </Box>
  );
}