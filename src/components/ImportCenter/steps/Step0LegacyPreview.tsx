/**
 * ProClaw v1.3 老系统数据迁移 - Step 0 老格式预览组件
 *
 * 显示 calamine 解析后的 LegacyParseResult：
 * - 文件格式（xls / xlsx）
 * - 表头预览（前 10 行）
 * - 分段标题（"客户档案" / "联系方式" 等）
 * - 客户 / 商品聚合组（带折叠展开）
 * - 待建档类别（product / supplier / customer）
 *
 * 用法：
 *   <Step0LegacyPreview
 *     preview={legacyParseResult}
 *     onConfirm={() => goNext()}
 *     onBack={() => goBack()}
 *   />
 */

import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { ImportTarget, LegacyParseResult } from '../../../types/import';
import {
  buildCategoryReviewList,
  countAggregationTotals,
  needsAggregationReview,
} from '../../../lib/import/legacyAdapter';

export interface Step0LegacyPreviewProps {
  preview: LegacyParseResult;
  /** 当前导入对象。传入后只展示该对象的聚合组和类别，避免客户预览里出现商品。 */
  target?: ImportTarget;
  onConfirm?: () => void;
  onBack?: () => void;
  /** 紧凑模式（嵌入 Step 0 区域时使用） */
  compact?: boolean;
}

const CATEGORY_TYPE_BY_TARGET: Partial<Record<ImportTarget, 'product' | 'supplier' | 'customer'>> = {
  products: 'product',
  suppliers: 'supplier',
  customers: 'customer',
};

const TYPE_LABELS: Record<string, string> = {
  product: '商品类别',
  supplier: '供应商类别',
  customer: '客户类别',
};

export default function Step0LegacyPreview({
  preview,
  target,
  compact = false,
}: Step0LegacyPreviewProps) {
  const totals = countAggregationTotals(preview);
  const categoryType = target ? CATEGORY_TYPE_BY_TARGET[target] : undefined;
  const categoryList = buildCategoryReviewList(preview.categories_to_create).filter(
    (item) => !categoryType || item.category_type === categoryType,
  );
  const multiCustomers = preview.customer_groups.filter((g) => g.contacts.length > 1).length;
  const multiProducts = preview.product_groups.filter((g) => g.variants.length > 1).length;
  const showCustomers = totals.customer_groups > 0 && (!target || target === 'customers');
  const showProducts = totals.product_groups > 0 && (!target || target === 'products');
  const reviewLabel =
    target === 'customers' && multiCustomers > 0
      ? `${multiCustomers} 个客户有多个联系人，执行前会确认`
      : target === 'products' && multiProducts > 0
        ? `${multiProducts} 个商品有多个 SKU，执行前会确认`
        : !target && needsAggregationReview(preview)
          ? '有多条记录需要合并，执行前会确认'
          : null;

  return (
    <Stack spacing={2}>
      {/* 1. 文件信息 */}
      <Stack direction="row" spacing={2} alignItems="center">
        <Chip
          label={preview.detected_format.toUpperCase()}
          color="primary"
          variant="outlined"
        />
        <Typography variant="body2" color="text.secondary">
          共 {preview.total_data_rows} 行数据 · {preview.field_names.length} 个字段
        </Typography>
        {reviewLabel && <Chip label={reviewLabel} color="warning" size="small" />}
      </Stack>

      {/* 2. 分段标题（如果有） */}
      {preview.segment_titles.length > 0 && (
        <Box>
          <Typography variant="overline" color="text.secondary">
            分段标题（{preview.segment_titles.length} 个）
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
            {preview.segment_titles.map((section, i) => (
              <Chip key={i} label={section.title} variant="outlined" size="small" />
            ))}
          </Stack>
        </Box>
      )}

      <Divider />

      {/* 3. 表头预览 */}
      {!compact && (
        <Box>
          <Typography variant="overline" color="text.secondary">
            表头预览（前 10 行）
          </Typography>
          <TableContainer
            sx={{
              mt: 1,
              maxHeight: 240,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {preview.field_names.map((f, i) => (
                    <TableCell key={i}>{f}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {preview.header_preview.slice(0, 10).map((row, ri) => (
                  <TableRow key={ri}>
                    {preview.field_names.map((_, ci) => (
                      <TableCell key={ci}>{row[ci] ?? ''}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      <Divider />

      {/* 4. 客户聚合组 */}
      {showCustomers && (
        <Box>
          <Typography variant="overline" color="text.secondary">
            客户聚合组（{totals.customer_groups} 个客户 ·{' '}
            {totals.customer_contacts} 个联系人）
          </Typography>
          <Box sx={{ mt: 1 }}>
            {preview.customer_groups.slice(0, 20).map((g, i) => (
              <Accordion key={i} disableGutters sx={{ mb: 0.5 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ flex: 1 }}>
                    <strong>{g.code || '(无编号)'}</strong> · {g.name}
                  </Typography>
                  <Chip
                    size="small"
                    label={`${g.contacts.length} 个联系人`}
                    color={g.contacts.length > 1 ? 'warning' : 'default'}
                  />
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        基础字段
                      </Typography>
                      <Box sx={{ pl: 2 }}>
                        {Object.entries(g.base_fields).map(([k, v]) => (
                          <Typography key={k} variant="body2">
                            <strong>{k}:</strong> {v || '(空)'}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        联系人
                      </Typography>
                      <Box sx={{ pl: 2 }}>
                        {g.contacts.map((c, ci) => (
                          <Typography
                            key={ci}
                            variant="body2"
                            sx={{ color: c.is_primary ? 'primary.main' : 'text.primary' }}
                          >
                            {c.is_primary && '★ '}
                            {c.contact_name || '(无名)'} ·{' '}
                            {c.phone || c.landline || '(无电话)'}
                            {c.address && ` · ${c.address}`}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  </Stack>
                </AccordionDetails>
              </Accordion>
            ))}
            {totals.customer_groups > 20 && (
              <Typography variant="caption" color="text.secondary">
                仅显示前 20 个，共 {totals.customer_groups} 个
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {/* 5. 商品聚合组 */}
      {showProducts && (
        <Box>
          <Typography variant="overline" color="text.secondary">
            商品聚合组（{totals.product_groups} 个 SPU ·{' '}
            {totals.product_skus} 个 SKU）
          </Typography>
          <Box sx={{ mt: 1 }}>
            {preview.product_groups.slice(0, 20).map((g, i) => (
              <Accordion key={i} disableGutters sx={{ mb: 0.5 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ flex: 1 }}>
                    <strong>{g.sku}</strong> · {g.name}
                  </Typography>
                  <Chip
                    size="small"
                    label={`${g.variants.length} 个变体`}
                    color={g.variants.length > 1 ? 'warning' : 'default'}
                  />
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={0.5}>
                    <Typography variant="body2">
                      <strong>类别:</strong> {g.category || '(无)'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>规格:</strong> {g.spec || '(无)'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      变体 SKU:
                    </Typography>
                    {g.variants.map((v, vi) => (
                      <Typography key={vi} variant="body2" sx={{ pl: 2 }}>
                        · {v.sku} {v.variant_name && `· ${v.variant_name}`}{' '}
                        {v.spec && `· ${v.spec}`}
                      </Typography>
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            ))}
            {totals.product_groups > 20 && (
              <Typography variant="caption" color="text.secondary">
                仅显示前 20 个，共 {totals.product_groups} 个
              </Typography>
            )}
          </Box>
        </Box>
      )}

      <Divider />

      {/* 6. 类别审核清单 */}
      {categoryList.length > 0 && (
        <Box>
          <Typography variant="overline" color="text.secondary">
            {categoryType ? TYPE_LABELS[categoryType] : '类别'}（{categoryList.length} 项）
          </Typography>
          <Alert severity="info" sx={{ mt: 1 }}>
            {categoryType
              ? `以下${TYPE_LABELS[categoryType]}会在导入时自动建档，可在本页关闭。已有的同名类别会跳过。`
              : '以下类别会在导入时自动建档，可在本页关闭。已有的同名类别会跳过。'}
          </Alert>
          <Box sx={{ mt: 1 }}>
            {(['product', 'supplier', 'customer'] as const).map((ct) => {
              const items = categoryList.filter((c) => c.category_type === ct);
              if (items.length === 0) return null;
              return (
                <Box key={ct} sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {TYPE_LABELS[ct]}（{items.length}）
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    flexWrap="wrap"
                    sx={{ mt: 0.5 }}
                  >
                    {items.slice(0, 30).map((item, i) => (
                      <Chip
                        key={i}
                        size="small"
                        label={`${item.name} × ${item.occurrences}`}
                        variant="outlined"
                      />
                    ))}
                    {items.length > 30 && (
                      <Chip
                        size="small"
                        label={`... 还有 ${items.length - 30} 个`}
                        variant="outlined"
                      />
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Stack>
  );
}
