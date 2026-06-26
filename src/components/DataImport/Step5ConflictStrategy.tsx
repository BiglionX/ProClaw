/**
 * Step 5: 选择冲突策略（命中已有记录时的处理方式）
 */

import { Box, Card, CardActionArea, CardContent, FormControlLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material';

import { CONFLICT_STRATEGIES, type ConflictStrategy } from '../../lib/importers/types';

export interface Step5Props {
  value: ConflictStrategy;
  onChange: (s: ConflictStrategy) => void;
  hasUniqueKey: boolean; // 是否存在可定位已有记录的字段（spu_code/name+brand）
}

export function Step5ConflictStrategy({ value, onChange, hasUniqueKey }: Step5Props) {
  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        重复数据如何处理？
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        当导入的商品已存在于商品库时，按下方策略处理。
      </Typography>

      <RadioGroup
        value={value}
        onChange={(e) => onChange(e.target.value as ConflictStrategy)}
        data-testid="conflict-strategy"
      >
        <Stack spacing={2}>
          {CONFLICT_STRATEGIES.map((s) => (
            <Card
              key={s.value}
              variant={value === s.value ? 'elevation' : 'outlined'}
              sx={{
                borderColor: value === s.value ? 'primary.main' : 'divider',
                borderWidth: value === s.value ? 2 : 1,
              }}
            >
              <CardActionArea>
                <CardContent>
                  <FormControlLabel
                    value={s.value}
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="subtitle1">{s.label}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {s.description}
                        </Typography>
                      </Box>
                    }
                  />
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      </RadioGroup>

      {!hasUniqueKey && (
        <Typography variant="caption" color="warning.main" sx={{ mt: 2, display: 'block' }}>
          ⚠ 当前未映射 <code>spu_code</code> 字段，将以「商品名称 + 品牌」匹配。
        </Typography>
      )}
    </Box>
  );
}