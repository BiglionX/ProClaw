import { Chip, Tooltip, type ChipProps } from '@mui/material';
import {
  CONFIDENCE_COLOR,
  CONFIDENCE_LABEL,
  type StockConfidence,
} from '../../lib/inventoryCalibrationService';

interface StockConfidenceChipProps {
  /** 库存置信度 */
  confidence: StockConfidence;
  /** 距离上次校准天数（用于 Tooltip 提示） */
  agingDays?: number;
  /** 是否为负库存（高优先级提示） */
  hasNegativeStock?: boolean;
  size?: ChipProps['size'];
  variant?: ChipProps['variant'];
}

/**
 * 库存置信度标签（PRD v12.0 §3.4）
 *
 * 颜色规则：
 * - high   : 绿色（success）
 * - medium : 黄色（warning）
 * - low    : 红色（error）
 */
export default function StockConfidenceChip({
  confidence,
  agingDays,
  hasNegativeStock,
  size = 'small',
  variant = 'filled',
}: StockConfidenceChipProps) {
  let label = `置信度 ${CONFIDENCE_LABEL[confidence]}`;
  let tooltip = '';

  if (hasNegativeStock) {
    label = '置信度 低（负库存）';
    tooltip = '存在负库存且未冲销';
  } else if (agingDays !== undefined) {
    if (confidence === 'high') {
      tooltip = `${agingDays} 天内有微盘点，数据准确`;
    } else if (confidence === 'medium') {
      tooltip = `${agingDays} 天内有进货但无微盘点，建议校准`;
    } else {
      tooltip = `${agingDays} 天未校准，建议尽快盘点`;
    }
  }

  return (
    <Tooltip title={tooltip} arrow>
      <Chip
        label={label}
        color={hasNegativeStock ? 'error' : CONFIDENCE_COLOR[confidence]}
        size={size}
        variant={variant}
        sx={{ fontWeight: 500 }}
      />
    </Tooltip>
  );
}
