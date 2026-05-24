// 桌面端通话页面
// v4.1: 音视频通话界面

import React, { useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Paper,
  Chip,
} from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeDownIcon from '@mui/icons-material/VolumeDown';
import CallEndIcon from '@mui/icons-material/CallEnd';
import { useCallStore } from '../lib/callStore';
import desktopCallManager from '../services/CallManager';

const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const CallPage: React.FC = () => {
  const status = useCallStore((s) => s.status);
  const callType = useCallStore((s) => s.callType);
  const direction = useCallStore((s) => s.direction);
  const remoteUserName = useCallStore((s) => s.remoteUserName);
  const durationSeconds = useCallStore((s) => s.durationSeconds);
  const isMuted = useCallStore((s) => s.isMuted);
  const isCameraOff = useCallStore((s) => s.isCameraOff);
  const isSpeakerOn = useCallStore((s) => s.isSpeakerOn);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const isVideo = callType === 'video';
  const isRinging = status === 'ringing';
  const isConnected = status === 'connected';
  const userName = remoteUserName || '未知用户';

  // 绑定视频流
  useEffect(() => {
    // 使用 desktopCallManager 的本地流和远程流
    // 注意: 由于 desktopCallManager 是模块级单例，需要通过 ref 访问
    if (isConnected && isVideo) {
      // 本地流和远程流绑定到 video 元素
      const localStream = (desktopCallManager as any).localStream as MediaStream | null;
      const remoteStream = (desktopCallManager as any).remoteStream as MediaStream | null;

      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    }
  }, [isConnected, isVideo]);

  return (
    <Box
      sx={{
        height: '100vh',
        bgcolor: '#1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 6,
        position: 'relative',
      }}
    >
      {/* 远程视频（全屏背景） */}
      {isVideo && isConnected && (
        <Box
          sx={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            '& video': { width: '100%', height: '100%', objectFit: 'cover' },
          }}
        >
          <video ref={remoteVideoRef} autoPlay playsInline />
        </Box>
      )}

      {/* 用户信息 */}
      <Box sx={{ textAlign: 'center', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Avatar
          sx={{
            width: 100,
            height: 100,
            mx: 'auto',
            mb: 3,
            bgcolor: '#6366f1',
            fontSize: 40,
            border: '4px solid rgba(99,102,241,0.4)',
          }}
        >
          {userName.charAt(0)}
        </Avatar>
        <Typography variant="h4" color="#fff" fontWeight={700} mb={1}>
          {userName}
        </Typography>
        <Typography variant="h6" color="rgba(255,255,255,0.6)" letterSpacing={2}>
          {isRinging
            ? direction === 'outgoing' ? '正在呼叫...' : '来电中...'
            : isConnected
            ? formatDuration(durationSeconds)
            : '通话结束'}
        </Typography>
        {isRinging && direction === 'outgoing' && (
          <Chip
            label="等待对方接听"
            variant="outlined"
            size="small"
            sx={{ mt: 2, color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
          />
        )}
      </Box>

      {/* 本地视频小窗口 */}
      {isVideo && isConnected && (
        <Paper
          elevation={8}
          sx={{
            position: 'absolute',
            top: 20,
            right: 20,
            width: 200,
            height: 150,
            borderRadius: 2,
            overflow: 'hidden',
            zIndex: 2,
            '& video': { width: '100%', height: '100%', objectFit: 'cover' },
          }}
        >
          <video ref={localVideoRef} autoPlay playsInline muted />
        </Paper>
      )}

      {/* 控制栏 */}
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', zIndex: 1 }}>
        {/* 静音 */}
        <IconButton
          onClick={() => desktopCallManager.toggleMute()}
          sx={{
            width: 52, height: 52,
            bgcolor: isMuted ? '#6366f1' : 'rgba(255,255,255,0.15)',
            color: '#fff',
            '&:hover': { bgcolor: isMuted ? '#4f46e5' : 'rgba(255,255,255,0.25)' },
          }}
        >
          {isMuted ? <MicOffIcon /> : <MicIcon />}
        </IconButton>

        {/* 摄像头（仅视频） */}
        {isVideo && (
          <IconButton
            onClick={() => desktopCallManager.toggleCamera()}
            sx={{
              width: 52, height: 52,
              bgcolor: isCameraOff ? '#6366f1' : 'rgba(255,255,255,0.15)',
              color: '#fff',
              '&:hover': { bgcolor: isCameraOff ? '#4f46e5' : 'rgba(255,255,255,0.25)' },
            }}
          >
            {isCameraOff ? <VideocamOffIcon /> : <VideocamIcon />}
          </IconButton>
        )}

        {/* 挂断 */}
        <IconButton
          onClick={() => desktopCallManager.hangup()}
          sx={{
            width: 64, height: 64,
            bgcolor: '#ef4444',
            color: '#fff',
            '&:hover': { bgcolor: '#dc2626' },
          }}
        >
          <CallEndIcon fontSize="large" />
        </IconButton>

        {/* 扬声器 */}
        <IconButton
          onClick={() => desktopCallManager.toggleSpeaker()}
          sx={{
            width: 52, height: 52,
            bgcolor: isSpeakerOn ? '#6366f1' : 'rgba(255,255,255,0.15)',
            color: '#fff',
            '&:hover': { bgcolor: isSpeakerOn ? '#4f46e5' : 'rgba(255,255,255,0.25)' },
          }}
        >
          {isSpeakerOn ? <VolumeUpIcon /> : <VolumeDownIcon />}
        </IconButton>
      </Box>
    </Box>
  );
};

export default CallPage;
