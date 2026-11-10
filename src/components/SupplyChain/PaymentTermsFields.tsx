import { useEffect, useState } from 'react';
import { Box, FormControl, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material';
import {
  creditLimitApplies,
  formatPaymentTerms,
  parsePaymentTerms,
  paymentTermsError,
  type PaymentTermsState,
  type SettlementType,
} from '../../lib/paymentTerms';

const TYPE_LABEL: Record<SettlementType, string> = {
  cash: '现结',
  monthly: '月结',
  custom: '自定义',
};

interface PaymentTermsFieldsProps {
  terms?: string;
  onTermsChange?: (terms: string) => void;
  onSettlementChange?: (type: SettlementType) => void;
  onError?: (message: string | undefined) => void;
  credit?: {
    value: number;
    error?: string;
    onChange: (value: number) => void;
  };
  /** 客户档案没有付款条件字段时，说明结算方式只控制信用额度。 */
  persistTerms?: boolean;
}

export default function PaymentTermsFields({
  terms = '',
  onTermsChange,
  onSettlementChange,
  onError,
  credit,
  persistTerms = true,
}: PaymentTermsFieldsProps) {
  const [state, setState] = useState<PaymentTermsState>(() => parsePaymentTerms(terms));
  const message = persistTerms ? paymentTermsError(state) : undefined;

  const publish = (next: PaymentTermsState) => {
    onSettlementChange?.(next.type);
    onError?.(persistTerms ? paymentTermsError(next) : undefined);
  };

  useEffect(() => {
    publish(state);
    // 只在挂载时把初始结算方式告诉父组件。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (next: PaymentTermsState) => {
    setState(next);
    publish(next);
    if (persistTerms) onTermsChange?.(formatPaymentTerms(next));
    if (credit && !creditLimitApplies(next.type) && credit.value !== 0) credit.onChange(0);
  };

  const showCredit = Boolean(credit) && creditLimitApplies(state.type);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormControl fullWidth>
        <InputLabel>付款条件</InputLabel>
        <Select
          value={state.type}
          label="付款条件"
          onChange={e => update({ ...state, type: e.target.value as SettlementType })}
        >
          {(Object.keys(TYPE_LABEL) as SettlementType[]).map(type => (
            <MenuItem key={type} value={type}>{TYPE_LABEL[type]}</MenuItem>
          ))}
        </Select>
      </FormControl>
      {state.type === 'monthly' && (
        <TextField
          label="账期天数"
          type="number"
          value={state.days}
          onChange={e => {
            const parsed = Number.parseInt(e.target.value, 10);
            update({ ...state, days: Number.isFinite(parsed) ? parsed : 0 });
          }}
          error={Boolean(message)}
          helperText={message || '例如 30 表示月结 30 天'}
          inputProps={{ min: 1 }}
          fullWidth
        />
      )}
      {state.type === 'custom' && (
        <TextField
          label="自定义付款条件"
          value={state.customText}
          onChange={e => update({ ...state, customText: e.target.value })}
          error={Boolean(message)}
          helperText={message || ' '}
          fullWidth
        />
      )}
      {!persistTerms && (
        <Typography variant="caption" color="text.secondary">
          客户档案只保存信用额度。这里的结算方式用来决定要不要填写额度。
        </Typography>
      )}
      {showCredit && credit && (
        <TextField
          label="信用额度"
          type="number"
          value={credit.value}
          onChange={e => {
            const parsed = Number.parseFloat(e.target.value);
            credit.onChange(Number.isFinite(parsed) ? parsed : 0);
          }}
          error={Boolean(credit.error)}
          helperText={credit.error || '月结或自定义结算时填写可欠款额度'}
          inputProps={{ min: 0 }}
          color={credit.error ? 'error' : 'warning'}
          sx={{
            '& .MuiOutlinedInput-root': { bgcolor: 'rgba(237, 108, 2, 0.08)' },
            '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 },
          }}
          fullWidth
        />
      )}
      {credit && !showCredit && (
        <Typography variant="body2" color="text.secondary">现结不使用信用额度。</Typography>
      )}
    </Box>
  );
}
