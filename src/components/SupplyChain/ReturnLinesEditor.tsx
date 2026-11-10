import { Box, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { summarizeReturnLines, type ReturnLineDraft } from '../../lib/returnOrderForm';

interface ReturnLinesEditorProps {
  lines: ReturnLineDraft[];
  onChange: (lines: ReturnLineDraft[]) => void;
  quantityHint?: string;
}

export default function ReturnLinesEditor({ lines, onChange, quantityHint = '最多' }: ReturnLinesEditorProps) {
  const totals = summarizeReturnLines(lines);

  const update = (index: number, patch: Partial<ReturnLineDraft>) => {
    onChange(lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  };

  return (
    <Box>
      <Table size="small" sx={{ tableLayout: 'fixed' }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 56 }}>序号</TableCell>
            <TableCell>商品</TableCell>
            <TableCell sx={{ width: 120 }} align="center">数量</TableCell>
            <TableCell sx={{ width: 120 }} align="center">单价</TableCell>
            <TableCell sx={{ width: 110 }} align="right">小计</TableCell>
            <TableCell sx={{ width: 180 }}>行说明</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lines.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>选择原单据后带出明细</TableCell>
            </TableRow>
          ) : lines.map((line, index) => (
            <TableRow key={`${line.product_id}-${index}`}>
              <TableCell sx={{ verticalAlign: 'middle' }}>{index + 1}</TableCell>
              <TableCell sx={{ verticalAlign: 'middle' }}>{line.product_name || line.product_id}</TableCell>
              <TableCell sx={{ verticalAlign: 'middle' }}>
                <TextField
                  type="number"
                  size="small"
                  fullWidth
                  value={line.quantity || ''}
                  onChange={e => update(index, { quantity: Number.parseInt(e.target.value, 10) || 0 })}
                  inputProps={{ min: 0, max: line.max_quantity }}
                  helperText={line.max_quantity != null ? `${quantityHint} ${line.max_quantity}` : ' '}
                />
              </TableCell>
              <TableCell sx={{ verticalAlign: 'middle' }}>
                <TextField
                  type="number"
                  size="small"
                  fullWidth
                  value={line.unit_price}
                  onChange={e => {
                    const parsed = Number.parseFloat(e.target.value);
                    update(index, { unit_price: Number.isFinite(parsed) ? parsed : 0 });
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText=" "
                />
              </TableCell>
              <TableCell align="right" sx={{ verticalAlign: 'middle', fontWeight: 600 }}>
                ¥{(line.quantity * line.unit_price).toFixed(2)}
              </TableCell>
              <TableCell sx={{ verticalAlign: 'middle' }}>
                <TextField
                  size="small"
                  fullWidth
                  value={line.line_note}
                  onChange={e => update(index, { line_note: e.target.value })}
                  placeholder="选填"
                  helperText=" "
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 4, mt: 1.5 }}>
        <Typography variant="body2">退货总数量：{totals.quantity}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>退货总金额：¥{totals.amount.toFixed(2)}</Typography>
      </Box>
    </Box>
  );
}
