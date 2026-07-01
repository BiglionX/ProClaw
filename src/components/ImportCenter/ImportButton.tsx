/**
 * ProClaw 批量导入中心 - 通用按钮（v1.2 P1）
 *
 * 4 个业务页（Products / Inventory / Purchase / Sales）顶部用此组件
 * 触发对应 target_type 的导入向导。
 */

import { FileUpload as FileUploadIcon } from '@mui/icons-material';
import { Button, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { ImportTarget } from '../../types/import';

export interface ImportButtonProps {
  /** 目标类型（不传则跳到导入中心让用户选） */
  target?: ImportTarget;
  /** 按钮文案 */
  label?: string;
  /** variant */
  variant?: 'text' | 'outlined' | 'contained';
  /** 颜色 */
  color?: 'primary' | 'secondary' | 'inherit';
  /** 尺寸 */
  size?: 'small' | 'medium' | 'large';
  /** 是否显示「批量导入」前缀图标 */
  showIcon?: boolean;
}

export default function ImportButton({
  target,
  label = '批量导入',
  variant = 'outlined',
  color = 'primary',
  size = 'small',
  showIcon = true,
}: ImportButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    const qs = target ? `?target=${target}` : '';
    navigate(`/import-center/new${qs}`);
  };

  return (
    <Tooltip title={target ? `批量导入${labelForTarget(target)}` : '打开批量导入中心'}>
      <Button
        variant={variant}
        color={color}
        size={size}
        startIcon={showIcon ? <FileUploadIcon /> : undefined}
        onClick={handleClick}
        data-testid={`import-button-${target ?? 'all'}`}
      >
        {label}
      </Button>
    </Tooltip>
  );
}

function labelForTarget(t: ImportTarget): string {
  const map: Record<ImportTarget, string> = {
    products: '商品',
    inventory: '库存交易',
    purchases: '采购订单',
    sales: '销售订单',
    suppliers: '供应商',
    customers: '客户',
  };
  return map[t];
}
