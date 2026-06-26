import { Box, Button, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useState } from 'react';

import { ImportWizard } from '../DataImport/ImportWizard';

interface DataImportStepProps {
  onImportSelected: (hasData: boolean) => void;
}

export function DataImportStep({ onImportSelected }: DataImportStepProps) {
  const [wizardOpen, setWizardOpen] = useState(false);
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        width: '100%',
        maxWidth: 500,
        mx: 'auto',
        py: 2,
      }}
    >
      <Typography
        variant="body2"
        sx={{ color: 'rgba(255,255,255,0.6)', mb: 1, textAlign: 'center' }}
      >
        您是否已经有商品数据？
      </Typography>

      <Button
        variant="contained"
        size="large"
        startIcon={<CloudUploadIcon />}
        onClick={() => {
          // 打开导入向导；用户完成后再标记为"已有数据"
          setWizardOpen(true);
        }}
        sx={{
          bgcolor: '#ff3b30',
          '&:hover': { bgcolor: '#d32f2f' },
          px: 4,
          py: 1.5,
          width: '100%',
          maxWidth: 360,
          borderRadius: 2,
        }}
      >
        已有数据，导入 Excel
      </Button>

      <Button
        variant="outlined"
        size="large"
        onClick={() => onImportSelected(false)}
        sx={{
          borderColor: 'rgba(255,255,255,0.3)',
          color: '#fff',
          '&:hover': { borderColor: 'rgba(255,255,255,0.5)', bgcolor: 'rgba(255,255,255,0.05)' },
          px: 4,
          py: 1.5,
          width: '100%',
          maxWidth: 360,
          borderRadius: 2,
        }}
      >
        从空白开始，稍后手动添加
      </Button>

      <ImportWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        initialTarget="products"
        onSuccess={() => onImportSelected(true)}
      />
    </Box>
  );
}
