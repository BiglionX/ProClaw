import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory2';
import { useState } from 'react';
import StockCalibrationDialog from './StockCalibrationDialog';
import {
  type PostSalesCheckResult,
  type PostPurchaseCheckResult,
} from '../../lib/inventoryCalibrationService';

interface MicroStocktakingPromptProps {
  open: boolean;
  onClose: () => void;
  /** 销售完成触发的结果 */
  salesResult?: PostSalesCheckResult | null;
  /** 进货完成触发的结果 */
  purchaseResult?: PostPurchaseCheckResult | null;
  productId: string;
  productName?: string;
  currentStock: number;
  onCalibrated?: (newStock: number) => void;
}

/**
 * 灵活库存（PRD v12.0）销售/进货完成后的微盘点建议弹窗
 *
 * - 销售完成后：如果满足 3 天未校准 + 热销 + 收银间隔 > 3 秒，弹出建议
 * - 进货完成后：如果进货后仍为负库存，弹出补充进货建议
 */
export default function MicroStocktakingPrompt({
  open,
  onClose,
  salesResult,
  purchaseResult,
  productId,
  productName,
  currentStock,
  onCalibrated,
}: MicroStocktakingPromptProps) {
  const [showCalibration, setShowCalibration] = useState(false);

  const isSales = !!salesResult;
  const isPurchase = !!purchaseResult;

  // 当前是否真的需要触发
  const shouldTrigger = salesResult?.should_trigger || purchaseResult?.should_trigger || false;
  const reason =
    salesResult?.reason || purchaseResult?.reason || '建议进行一次微盘点';

  if (!shouldTrigger) {
    // 不满足触发条件时不渲染
    return null;
  }

  return (
    <>
      <Dialog open={open && !showCalibration} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InventoryIcon color="warning" />
          建议微盘点
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <DialogContentText>
              {productName && <strong>{productName}</strong>}
              {isSales && ' 销售已完成'}
              {isPurchase && ' 进货已完成'}
              ，是否进行一次快速盘点以提高库存数据准确度？
            </DialogContentText>
            <Alert severity={currentStock < 0 ? 'error' : 'warning'}>
              {reason}
            </Alert>
            {currentStock < 0 && (
              <Alert severity="error" variant="outlined">
                当前库存为 <strong>{currentStock}</strong>，建议补充进货以冲销负库存
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit">
            稍后
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => setShowCalibration(true)}
          >
            立即校准
          </Button>
        </DialogActions>
      </Dialog>

      <StockCalibrationDialog
        open={showCalibration}
        onClose={() => {
          setShowCalibration(false);
          onClose();
        }}
        productId={productId}
        productName={productName}
        currentStock={currentStock}
        trigger={isSales ? 'post_sales' : 'post_purchase'}
        triggerReason={reason}
        onSuccess={(newStock) => {
          setShowCalibration(false);
          onCalibrated?.(newStock);
          onClose();
        }}
      />
    </>
  );
}
