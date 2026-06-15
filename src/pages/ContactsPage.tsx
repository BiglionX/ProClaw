import {
  Chat as ChatIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
  Groups as GroupIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Contact,
  addContact,
  getContacts,
  AddContactInput,
} from '../lib/contactService';
import { useAppModeStore } from '../config/appMode';
import { onProfileChanged } from '../lib/agentProfileService';

export default function ContactsPage() {
  const mode = useAppModeStore(state => state.mode);
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newContact, setNewContact] = useState<AddContactInput>({
    name: '', phone: '', email: '', external_type: 'customer',
  });

  const loadContacts = async () => {
    setLoading(true);
    try {
      const data = await getContacts({ search: search || undefined });
      setContacts(data);
    } catch (e) {
      console.error('加载联系人失败:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [search]);

  // 监听 Agent 个性化变更 → 重新加载联系人（更新名称/头像）
  useEffect(() => {
    const unsubscribe = onProfileChanged(() => {
      loadContacts();
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  /**
   * 点击头像事件（重要：与点击行/ChatIcon 一致）——
   * 一律优先进入聊天窗口。
   * · AI Team 群组的「成员详情」路径已迁到 ChatPage 头部头像点击，不再在这里展开成员弹窗。
   * · 单个 Agent 的「个人资料/skill 介绍」路径已迁到 ChatPage 头部头像点击。
   */
  const handleAvatarClick = (e: React.MouseEvent, contact: Contact) => {
    e.stopPropagation();
    navigate(`/chat/${contact.id}`);
  };

  const getFilteredContacts = () => {
    if (filterType === 'all') return contacts;
    if (filterType === 'unread') return contacts.filter(c => (c.unread_count || 0) > 0);
    if (filterType === 'group') return contacts.filter(c => c.contact_type === 'group');
    if (filterType === 'customer') return contacts.filter(c => c.external_type === 'customer');
    if (filterType === 'supplier') return contacts.filter(c => c.external_type === 'supplier');
    if (filterType === 'team') return contacts.filter(c => c.contact_type === 'team');
    return contacts;
  };

  const filteredContacts = getFilteredContacts();

  // 分区：AI Team 群组（contact_type='group'）在顶部，其他联系人紧随其后
  // 模拟 QQ 的"我的群聊"区块
  const aiTeamGroups = filteredContacts.filter(c => c.contact_type === 'group');
  const otherContacts = filteredContacts.filter(c => c.contact_type !== 'group');

  /** 从 last_message 提取人数 */
  const extractMemberCount = (lastMsg?: string): number | null => {
    if (!lastMsg) return null;
    const m = lastMsg.match(/(\d+)\s*人/);
    return m ? parseInt(m[1], 10) : null;
  };

  /** 渲染单个联系人 */
  const renderContact = (contact: Contact) => (
    <Box key={contact.id}>
      <Divider component="li" />
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
          >
            <Box sx={{ position: 'relative' }}>
              <IconButton
                onClick={(e) => handleAvatarClick(e, contact)}
                size="small"
                sx={{ p: 0 }}
                title={
                  contact.contact_type === 'group'
                    ? '点击查看团队成员'
                    : contact.contact_type === 'team'
                      ? '点击查看 Agent 介绍'
                      : undefined
                }
              >
                <Avatar
                  sx={{
                    bgcolor: contact.contact_type === 'group' ? '#ff6d00' : contact.contact_type === 'team' ? '#4caf50' : '#1976d2',
                    width: 44,
                    height: 44,
                    fontSize: '1.1rem',
                  }}
                >
                  {contact.contact_type === 'group' ? <GroupIcon /> : contact.name.charAt(0)}
                </Avatar>
              </IconButton>
              {/* AI Team 群组：始终在线（绿点），模拟 QQ 在线状态 */}
              {contact.contact_type === 'group' && (
                <CircleIcon
                  sx={{
                    position: 'absolute',
                    right: 0,
                    bottom: 0,
                    fontSize: 14,
                    color: '#4caf50',
                    bgcolor: 'white',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                  }}
                />
              )}
            </Box>
          </Badge>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography fontWeight={contact.unread_count ? 700 : 500} fontSize="0.95rem">
                {contact.name}
              </Typography>
              <Chip
                label={getTypeLabel(contact)}
                size="small"
                color={getTypeColor(contact)}
                variant="outlined"
                sx={{ height: 20, fontSize: '0.65rem' }}
              />
              {contact.contact_type === 'group' && (() => {
                const mc = extractMemberCount(contact.last_message);
                if (mc) {
                  return (
                    <Chip
                      label={`${mc}人在线`}
                      size="small"
                      sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#fff3e0', color: '#e65100', fontWeight: 500 }}
                    />
                  );
                }
                return null;
              })()}
            </Box>
          }
          secondary={
            <Box sx={{ mt: 0.3 }}>
              {contact.last_message ? (
                <Typography variant="body2" fontWeight={contact.unread_count ? 600 : 400}
                  sx={{
                    color: contact.unread_count ? 'text.primary' : 'text.secondary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 350,
                  }}
                >
                  {contact.last_from === contact.id ? contact.last_message : `你: ${contact.last_message}`}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.disabled">
                  {contact.phone || contact.email || '暂无消息'}
                </Typography>
              )}
            </Box>
          }
        />
        <Box sx={{ textAlign: 'right', ml: 2 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            {formatTime(contact.last_message_time)}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
            {mode === 'light' && contact.external_type === 'customer' && (
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); alert('发送短信功能即将上线'); }}>
                <ChatIcon fontSize="small" color="action" />
              </IconButton>
            )}
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/chat/${contact.id}`); }}>
              <ChatIcon fontSize="small" color="action" />
            </IconButton>
          </Box>
        </Box>
      </ListItemButton>
    </Box>
  );

  /** 渲染分区（带 header） */
  const renderSection = (title: string, icon: React.ReactNode, items: Contact[], color: string) => (
    <Box>
      {/* 分区 header（QQ 群组风格） */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1,
          bgcolor: '#fafafa',
          borderBottom: '1px solid',
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          zIndex: 1,
        }}
      >
        {icon}
        <Typography variant="body2" fontWeight={600} sx={{ color }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.disabled">
          ({items.length})
        </Typography>
      </Box>
      {items.map(renderContact)}
    </Box>
  );

  const handleAddContact = async () => {
    if (!newContact.name.trim()) return;
    try {
      await addContact(newContact);
      setAddOpen(false);
      setNewContact({ name: '', phone: '', email: '', external_type: 'customer' });
      loadContacts();
    } catch (e) {
      console.error('添加联系人失败:', e);
    }
  };

  const getTypeLabel = (c: Contact) => {
    if (c.contact_type === 'group') return '群聊';
    if (c.contact_type === 'team') return '团队成员';
    if (c.external_type === 'supplier') return '供应商';
    if (c.external_type === 'both') return '客户/供应商';
    return '客户';
  };

  const getTypeColor = (c: Contact): 'primary' | 'success' | 'warning' | 'default' | 'error' => {
    if (c.contact_type === 'group') return 'error';
    if (c.contact_type === 'team') return 'success';
    if (c.external_type === 'supplier') return 'warning';
    return 'primary';
  };

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

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" fontWeight={700}>联系人</Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setAddOpen(true)}
          sx={{
            bgcolor: '#ff3b30',
            '&:hover': { bgcolor: '#e0352b' },
            borderRadius: 2,
            textTransform: 'none',
          }}
        >
          添加联系人
        </Button>
      </Box>

      {/* 搜索和筛选 */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="搜索联系人..."
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
          value={filterType}
          exclusive
          onChange={(_, v) => v && setFilterType(v)}
          size="small"
        >
          <ToggleButton value="all">全部</ToggleButton>
          <ToggleButton value="unread">
            <Badge color="error" variant="dot" invisible={(contacts.filter(c => (c.unread_count || 0) > 0).length === 0)}>
              未读
            </Badge>
          </ToggleButton>
          <ToggleButton value="group">群聊</ToggleButton>
          <ToggleButton value="team">团队</ToggleButton>
          <ToggleButton value="customer">客户</ToggleButton>
          <ToggleButton value="supplier">供应商</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* 联系人列表 */}
      <Box sx={{ bgcolor: 'white', borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">加载中...</Typography>
          </Box>
        ) : filteredContacts.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <PersonIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">暂无联系人</Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
              点击右上角的"添加联系人"按钮开始添加
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {/* AI Team 群聊分区（QQ 风格 "我的群聊"） */}
            {aiTeamGroups.length > 0 && renderSection(
              'AI Team 群聊',
              <GroupIcon fontSize="small" sx={{ color: '#ff6d00' }} />,
              aiTeamGroups,
              '#ff6d00'
            )}
            {/* 其他联系人分区 */}
            {otherContacts.length > 0 && renderSection(
              filterType === 'unread' ? '未读联系人' : filterType === 'team' ? '团队成员' : filterType === 'customer' ? '客户' : filterType === 'supplier' ? '供应商' : '联系人',
              <PersonIcon fontSize="small" sx={{ color: '#1976d2' }} />,
              otherContacts,
              '#1976d2'
            )}
          </List>
        )}
      </Box>

      {/* 添加联系人 Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>添加联系人</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="姓名"
              fullWidth
              size="small"
              value={newContact.name}
              onChange={e => setNewContact({ ...newContact, name: e.target.value })}
              required
            />
            <TextField
              label="手机号"
              fullWidth
              size="small"
              value={newContact.phone}
              onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
            />
            <TextField
              label="邮箱"
              fullWidth
              size="small"
              value={newContact.email}
              onChange={e => setNewContact({ ...newContact, email: e.target.value })}
            />
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>联系人类型</Typography>
              <ToggleButtonGroup
                value={newContact.external_type}
                exclusive
                size="small"
                onChange={(_, v) => v && setNewContact({ ...newContact, external_type: v })}
              >
                <ToggleButton value="customer">客户</ToggleButton>
                <ToggleButton value="supplier">供应商</ToggleButton>
                <ToggleButton value="both">客户/供应商</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleAddContact}
            disabled={!newContact.name.trim()}
            sx={{
              bgcolor: '#ff3b30',
              '&:hover': { bgcolor: '#e0352b' },
            }}
          >
            添加
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
