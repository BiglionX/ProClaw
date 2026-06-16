import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputAdornment,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  calibrateStock,
  forceClearNegative,
  supplementInbound,
  type CalibrationTrigger,
  type StockCalibrationInput,
} from '../../lib/inventoryCalibrationService';

interface StockCalibrationDialogProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName?: string;
  currentStock: number;
  /** 触发场景：post_sales / post_purchase / manual */
  trigger: CalibrationTrigger;
  /** 触发原因（仅展示用） */
  triggerReason?: string;
  onSuccess?: (newStock: number) => void;
}

type Mode = 'micro_count' | 'supplement' | 'force_clear';

/**
 * 灵活库存（PRD v12.0）微盘点对话框
 *
 * 支持三种校准模式：
 * - micro_count  : 微盘点（输入实际库存，系统自动调整差额）
 * - supplement   : 补充进货（冲销负库存）
 * - force_clear  : 强制清零（盘点时直接设置库存）
 */
export default function StockCalibrationDialog({
  open,
  onClose,
  productId,
  productName,
  currentStock,
  trigger,
  triggerReason,
  onSuccess,
}: StockCalibrationDialogProps) {
  const [mode, setMode] = useState<Mode>('micro_count');
  const [actualStock, setActualStock] = useState(currentStock);
  const [expectedStock, setExpectedStock] = useState(currentStock);
  const [supplementQty, setSupplementQty] = useState(1);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 打开时根据触发场景自动选择 mode
  useEffect(() => {
    if (open) {
      setActualStock(currentStock);
      setExpectedStock(currentStock);
      setSupplementQty(Math.max(1, Math.ceil(-currentStock)));
      setReason('');
      setError('');
      // post_sales 默认 micro_count；post_purchase 默认 supplement（冲销负库存）
      if (trigger === 'post_purchase' && currentStock < 0) {
        setMode('supplement');
      } else if (currentStock < 0) {
        setMode('supplement');
      } else {
        setMode('micro_count');
      }
    }
  }, [open, currentStock, trigger]);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      let newStock = currentStock;
      if (mode === 'micro_count') {
        const result = await calibrateStock({
          product_id: productId,
          calibration_type: 'micro_count',
          expected_stock: currentStock,
          actual_stock: actualStock,
          reason: reason || undefined,
          triggered_by: trigger,
        } as StockCalibrationInput);
        newStock = result.new_stock;
      } else if (mode === 'supplement') {
        if (supplementQty <= 0) {
          setError('补充数量必须大于 0');
          setLoading(false);
          return;
        }
        const result = await supplementInbound(
          productId,
          supplementQty,
          reason || '微盘点补充进货冲销负库存'
        );
        newStock = result.new_stock;
      } else {
        if (expectedStock < 0) {
          setError('强制清零后的库存不能为负数');
          setLoading(false);
          return;
        }
        const result = await forceClearNegative(
          productId,
          expectedStock,
          reason || '微盘点强制清零'
        );
        newStock = result.new_stock;
      }
      onSuccess?.(newStock);
      onClose();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        微盘点校准
        {productName && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {productName}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {triggerReason && (
          <Box
            sx={{
              p: 1.5,
              borderRadius: 1,
              bgcolor: 'warning.lighter',
              border: '1px solid',
              borderColor: 'warning.light',
            }}
          >
            <Typography variant="body2" color="warning.dark">
              触发原因：{triggerReason}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            当前系统库存：
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: currentStock < 0 ? 'error.main' : 'text.primary',
              fontWeight: 600,
            }}
          >
            {currentStock}
          </Typography>
          {currentStock < 0 && (
            <Typography variant="caption" color="error">
              （负库存）
            </Typography>
          )}
        </Box>

        <FormControl component="fieldset">
          <RadioGroup
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            row
          >
            <FormControlLabel
              value="micro_count"
              control={<Radio />}
              label="微盘点"
            />
            <FormControlLabel
              value="supplement"
              control={<Radio />}
              label="补充进货"
            />
            <FormControlLabel
              value="force_clear"
              control={<Radio />}
              label="强制清零"
            />
          </RadioGroup>
        </FormControl>

        {mode === 'micro_count' && (
          <Stack spacing={2}>
            <TextField
              label="实际盘点库存"
              type="number"
              fullWidth
              value={actualStock}
              onChange={(e) => setActualStock(parseInt(e.target.value || '0', 10))}
              helperText={
                actualStock === currentStock
                  ? '实际库存与系统一致，无需调整'
                  : `差额 = ${actualStock - currentStock}，系统将自动调整`
              }
            />
          </Stack>
        )}

        {mode === 'supplement' && (
          <Stack spacing={2}>
            <TextField
              label="补充进货数量"
              type="number"
              fullWidth
              value={supplementQty}
              onChange={(e) => setSupplementQty(parseInt(e.target.value || '0', 10))}
              inputProps={{ min: 1 }}
              InputProps={{
                endAdornment: <InputAdornment position="end">件</InputAdornment>,
              }}
              helperText={
                currentStock < 0
                  ? `当前负库存 ${currentStock}，建议至少补充 ${Math.ceil(-currentStock)} 件`
                  : `补充后库存 = ${currentStock + supplementQty}`
              }
            />
          </Stack>
        )}

        {mode === 'force_clear' && (
          <Stack spacing={2}>
            <TextField
              label="盘点目标库存"
              type="number"
              fullWidth
              value={expectedStock}
              onChange={(e) => setExpectedStock(parseInt(e.target.value || '0', 10))}
              inputProps={{ min: 0 }}
              helperText="强制设置库存为该值（仅当确认盘点结果时使用）"
            />
          </Stack>
        )}

        <TextField
          label="备注/原因"
          fullWidth
          multiline
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="可选：例如「进货时发现少 1 件，已与供应商确认」"
        />

        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          稍后再说
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? '处理中…' : '确认校准'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
