import {
  Chat as ChatIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
  Groups as GroupIcon,
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
import { Contact, addContact, getContacts, AddContactInput } from '../lib/contactService';
import { useAppModeStore } from '../config/appMode';

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
            {filteredContacts.map((contact, idx) => (
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
                    >
                      <Avatar
                        sx={{
                          bgcolor: contact.contact_type === 'group' ? '#ff6d00' : contact.contact_type === 'team' ? '#4caf50' : '#1976d2',
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
            ))}
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
