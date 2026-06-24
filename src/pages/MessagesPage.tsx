import {
  Chat as ChatIcon,
  Search as SearchIcon,
  Groups as GroupIcon,
} from '@mui/icons-material';
import {
  Avatar,
  Badge,
  Box,
  Divider,
  InputAdornment,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecentContacts } from '../lib/hooks/useContacts';

export default function MessagesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const { data: contacts = [], isLoading: loading } = useRecentContacts('self');

  const filtered = contacts.filter(c => {
    if (filter === 'unread') return (c.unread_count || 0) > 0;
    if (search) {
      return c.name.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
    return d.toLocaleDateString('zh-CN');
  };

  const totalUnread = contacts.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h5" fontWeight={700}>消息</Typography>
          {totalUnread > 0 && (
            <Chip label={`${totalUnread}条未读`} color="error" size="small" />
          )}
        </Box>
      </Box>

      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="搜索消息..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ minWidth: 280 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
            ),
          }}
        />
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(_, v) => v && setFilter(v)}
          size="small"
        >
          <ToggleButton value="all">全部</ToggleButton>
          <ToggleButton value="unread">
            <Badge color="error" variant="dot" invisible={totalUnread === 0}>
              未读
            </Badge>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ bgcolor: 'white', borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">加载中...</Typography>
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <ChatIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              {filter === 'unread' ? '没有未读消息' : '暂无消息'}
            </Typography>
            {filter !== 'unread' && (
              <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
                去"联系人"页面选择联系人开始聊天
              </Typography>
            )}
          </Box>
        ) : (
          <List disablePadding>
            {filtered.map((contact, idx) => (
              <Box key={contact.id}>
                {idx > 0 && <Divider component="li" />}
                <ListItemButton
                  onClick={() => navigate(`/chat/${contact.id}`)}
                  sx={{
                    py: 1.5,
                    px: 2,
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' },
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      color="error"
                      badgeContent={contact.unread_count || 0}
                      invisible={!contact.unread_count}
                      max={99}
                    >
                      <Avatar
                        sx={{
                          bgcolor: contact.contact_type === 'group' ? '#ff6d00' : contact.unread_count ? '#ff3b30' : '#1976d2',
                          width: 44,
                          height: 44,
                        }}
                      >
                        {contact.contact_type === 'group' ? <GroupIcon /> : contact.name.charAt(0)}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography fontWeight={contact.unread_count ? 700 : 500} fontSize="0.95rem">
                        {contact.name}
                      </Typography>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        sx={{
                          color: contact.unread_count ? 'text.primary' : 'text.secondary',
                          fontWeight: contact.unread_count ? 600 : 400,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 350,
                        }}
                      >
                        {contact.last_message || '开始聊天'}
                      </Typography>
                    }
                  />
                  <Box sx={{ textAlign: 'right', ml: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" noWrap>
                      {formatTime(contact.last_message_time)}
                    </Typography>
                    {contact.unread_count ? (
                      <Chip
                        label={contact.unread_count}
                        size="small"
                        color="error"
                        sx={{ height: 18, mt: 0.5, fontSize: '0.65rem' }}
                      />
                    ) : null}
                  </Box>
                </ListItemButton>
              </Box>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
}
