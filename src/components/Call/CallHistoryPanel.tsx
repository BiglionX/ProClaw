// 通话记录面板（桌面端聊天详情页内嵌）
// v4.1: 通话历史

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Divider,
  CircularProgress,
} from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import VideocamIcon from '@mui/icons-material/Videocam';
import PhoneMissedIcon from '@mui/icons-material/PhoneMissed';
import CallMadeIcon from '@mui/icons-material/CallMade';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import { getCallRecords, CallRecord } from '../../lib/callService';

const formatDuration = (s: number): string => {
  if (s <= 0) return '';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const formatTime = (ts: number | null): string => {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

interface Props {
  contactId: string;
  userId?: string;
}

const STATUS_COLORS: Record<string, { color: string; icon: React.ReactElement }> = {
  answered: { color: '#10b981', icon: <PhoneIcon fontSize="small" /> },
  ended: { color: '#888', icon: <PhoneIcon fontSize="small" /> },
  missed: { color: '#ef4444', icon: <PhoneMissedIcon fontSize="small" /> },
  rejected: { color: '#f59e0b', icon: <PhoneMissedIcon fontSize="small" /> },
  busy: { color: '#f59e0b', icon: <PhoneMissedIcon fontSize="small" /> },
  ringing: { color: '#6366f1', icon: <PhoneIcon fontSize="small" /> },
};

export default function CallHistoryPanel({ contactId, userId }: Props) {
  const [records, setRecords] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecords();
  }, [contactId, userId]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await getCallRecords({
        user_id: userId,
        contact_id: contactId,
        limit: 20,
      });
      setRecords(data);
    } catch (e) {
      console.error('加载通话记录失败:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (records.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4, color: '#999' }}>
        <PhoneIcon sx={{ fontSize: 40, mb: 1 }} />
        <Typography variant="body2" color="text.secondary">暂无通话记录</Typography>
      </Box>
    );
  }

  return (
    <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
      {records.map((r, idx) => {
        const statusInfo = STATUS_COLORS[r.status] || STATUS_COLORS.missed;
        const isIncoming = r.direction === 'incoming';
        const displayName = isIncoming ? (r.caller_name || r.caller_id) : (r.callee_name || r.callee_id);

        return (
          <React.Fragment key={r.id}>
            {idx > 0 && <Divider component="li" />}
            <ListItem>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: statusInfo.color + '20', width: 36, height: 36 }}>
                  {React.cloneElement(statusInfo.icon, { sx: { color: statusInfo.color, fontSize: 18 } })}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight={500}>
                      {displayName}
                    </Typography>
                    {isIncoming ? (
                      <CallReceivedIcon sx={{ fontSize: 14, color: '#10b981' }} />
                    ) : (
                      <CallMadeIcon sx={{ fontSize: 14, color: '#6366f1' }} />
                    )}
                    <Chip
                      label={r.call_type === 'video' ? '视频' : '语音'}
                      size="small"
                      icon={r.call_type === 'video' ? <VideocamIcon /> : <PhoneIcon />}
                      variant="outlined"
                      sx={{ height: 20, fontSize: 11 }}
                    />
                  </Box>
                }
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Chip
                      label={<>
                        {statusInfo.color === '#ef4444' ? '未接' :
                         statusInfo.color === '#f59e0b' ? '已拒' :
                         statusInfo.color === '#10b981' ? '已接' :
                         r.status}
                      </>}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: 10,
                        bgcolor: statusInfo.color + '15',
                        color: statusInfo.color,
                        fontWeight: 600,
                      }}
                    />
                    {r.duration_seconds > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        {formatDuration(r.duration_seconds)}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.disabled">
                      {formatTime(r.started_at)}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          </React.Fragment>
        );
      })}
    </List>
  );
}
