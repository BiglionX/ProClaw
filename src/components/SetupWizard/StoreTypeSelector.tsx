import { useState } from 'react';
import { Box, Button, Card, CardActionArea, Typography } from '@mui/material';

interface StoreTypeSelectorProps {
  onStoreTypeSelected: (type: string) => void;
}

const STORE_TYPES = [
  { value: 'catering', label: '餐饮', icon: '🍜', desc: '餐厅、小吃、饮品店' },
  { value: 'retail', label: '零售', icon: '🏪', desc: '便利店、超市、百货' },
  { value: 'service', label: '服务', icon: '💇', desc: '美容、维修、家政' },
  { value: 'fresh', label: '生鲜', icon: '🥬', desc: '水果、蔬菜、肉禽蛋' },
  { value: 'other', label: '其他', icon: '📦', desc: '其他行业类型' },
];

export function StoreTypeSelector({ onStoreTypeSelected }: StoreTypeSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selected) onStoreTypeSelected(selected);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
      <Typography
        variant="body2"
        sx={{ color: 'rgba(255,255,255,0.6)', mb: 2, textAlign: 'center' }}
      >
        请选择您的店铺类型
      </Typography>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
        {STORE_TYPES.map(type => (
          <Card
            key={type.value}
            elevation={0}
            sx={{
              width: 110,
              bgcolor: selected === type.value
                ? 'rgba(255,59,48,0.2)'
                : 'rgba(255,255,255,0.05)',
              border: selected === type.value
                ? '2px solid #ff3b30'
                : '1px solid rgba(255,255,255,0.15)',
              borderRadius: 2,
              transition: 'all 0.2s',
              cursor: 'pointer',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.1)',
                borderColor: 'rgba(255,59,48,0.5)',
              },
            }}
            onClick={() => setSelected(type.value)}
          >
            <CardActionArea sx={{ p: 1.5 }}>
              <Typography variant="h4" sx={{ textAlign: 'center', mb: 0.5 }}>
                {type.icon}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#fff',
                  fontWeight: 600,
                  textAlign: 'center',
                  fontSize: '0.85rem',
                }}
              >
                {type.label}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', display: 'block', fontSize: '0.65rem', mt: 0.5 }}
              >
                {type.desc}
              </Typography>
            </CardActionArea>
          </Card>
        ))}
      </Box>
      {selected && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button
            variant="contained"
            onClick={handleConfirm}
            sx={{
              bgcolor: '#ff3b30',
              '&:hover': { bgcolor: '#d32f2f' },
              px: 4,
            }}
          >
            确认选择
          </Button>
        </Box>
      )}
    </Box>
  );
}
