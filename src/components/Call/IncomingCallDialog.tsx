// 来电弹窗组件
// v4.1: 桌面端音视频来电通知

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Avatar,
  IconButton,
} from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import VideocamIcon from '@mui/icons-material/Videocam';
import CallEndIcon from '@mui/icons-material/CallEnd';
import CloseIcon from '@mui/icons-material/Close';
import { useCallStore } from '../../lib/callStore';
import desktopCallManager from '../../services/CallManager';

const IncomingCallDialog: React.FC = () => {
  const incomingCall = useCallStore((s) => s.incomingCall);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (incomingCall) {
      setOpen(true);
    }
  }, [incomingCall]);

  const isVideo = incomingCall?.callType === 'video';
  const callerName = incomingCall?.callerName || '未知用户';
  const initial = callerName.charAt(0).toUpperCase();

  const handleAccept = () => {
    setOpen(false);
    desktopCallManager.acceptIncoming();
  };

  const handleReject = () => {
    setOpen(false);
    desktopCallManager.rejectIncoming();
  };

  if (!incomingCall) return null;

  return (
    <Dialog
      open={open}
      onClose={handleReject}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          p: 2,
          textAlign: 'center',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <IconButton
          onClick={handleReject}
          size="small"
          sx={{ position: 'absolute', right: 8, top: 8, color: '#999' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ py: 3 }}>
        <Avatar
          sx={{
            width: 80,
            height: 80,
            mx: 'auto',
            mb: 2,
            bgcolor: '#6366f1',
            fontSize: 32,
          }}
        >
          {initial}
        </Avatar>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          {callerName}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, color: '#666' }}>
          {isVideo ? <VideocamIcon color="inherit" /> : <PhoneIcon color="inherit" />}
          <Typography variant="body1" color="text.secondary">
            {isVideo ? '视频通话邀请' : '语音通话邀请'}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', gap: 4, pb: 2 }}>
        <Button
          variant="contained"
          onClick={handleReject}
          sx={{
            width: 64,
            height: 64,
            minWidth: 64,
            borderRadius: '50%',
            bgcolor: '#ef4444',
            '&:hover': { bgcolor: '#dc2626' },
          }}
        >
          <CallEndIcon />
        </Button>
        <Button
          variant="contained"
          onClick={handleAccept}
          sx={{
            width: 64,
            height: 64,
            minWidth: 64,
            borderRadius: '50%',
            bgcolor: '#10b981',
            '&:hover': { bgcolor: '#059669' },
          }}
        >
          <PhoneIcon />
        </Button>
      </DialogActions>
      <Typography variant="caption" color="text.disabled" sx={{ mb: 1 }}>
        点击接听或拒绝
      </Typography>
    </Dialog>
  );
};

export default IncomingCallDialog;
