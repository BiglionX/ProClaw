import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { RocketLaunch, ArrowBack } from '@mui/icons-material';

interface LibraryModeToggleProps {
  currentMode: 'simple' | 'ecommerce';
  onUpgrade: () => void;
  onDowngrade: () => void;
}

export const LibraryModeToggle: React.FC<LibraryModeToggleProps> = ({
  currentMode,
  onUpgrade,
  onDowngrade,
}) => {
  if (currentMode === 'simple') {
    return (
      <Tooltip title="升级为电商商品库：支持多规格、多图管理" placement="bottom">
        <IconButton
          onClick={onUpgrade}
          color="primary"
          sx={{
            bgcolor: 'primary.light',
            color: 'white',
            '&:hover': {
              bgcolor: 'primary.main',
            },
          }}
        >
          <RocketLaunch fontSize="small" />
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <Tooltip title="返回简单商品库：更适合小商家使用" placement="bottom">
      <IconButton
        onClick={onDowngrade}
        color="warning"
        sx={{
          bgcolor: 'warning.light',
          color: 'white',
          '&:hover': {
            bgcolor: 'warning.main',
          },
        }}
      >
        <ArrowBack fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};
