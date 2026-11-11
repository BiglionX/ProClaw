import { useMemo, useState } from 'react';
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  TextField,
  Typography,
} from '@mui/material';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import HistoryIcon from '@mui/icons-material/History';
import { LocalUser } from '../../lib/authStore';
import { darkFieldSx, isBoss, lightFieldSx, roleLabel } from './accountShared';
import {
  featuredLoginAccounts,
  isDemoAccountUser,
  isTestJunkAccount,
} from './loginAccounts';

interface LoginAccountPickerProps {
  accounts: LocalUser[];
  isLoading?: boolean;
  onSwitch: (accountId: string) => void;
  theme?: 'dark' | 'light';
}

export default function LoginAccountPicker({
  accounts,
  isLoading,
  onSwitch,
  theme = 'dark',
}: LoginAccountPickerProps) {
  const [showTests, setShowTests] = useState(false);
  const dark = theme === 'dark';
  const featured = useMemo(() => featuredLoginAccounts(accounts), [accounts]);
  const featuredIds = useMemo(() => new Set(featured.map(account => account.id)), [featured]);
  const others = accounts.filter(account => !featuredIds.has(account.id));
  const testOthers = others.filter(isTestJunkAccount);
  const normalOthers = others.filter(account => !isTestJunkAccount(account));
  const options = showTests ? others : normalOthers;

  if (accounts.length === 0) return null;

  const textColor = dark ? '#fff' : '#333';
  const muted = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.55)';

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="overline" sx={{ color: muted }}>
        选择账号
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
        {featured.map(account => {
          const demo = isDemoAccountUser(account);
          const label = account.name || account.email || account.id;
          return (
            <Button
              key={account.id}
              type="button"
              disabled={isLoading}
              onClick={() => onSwitch(account.id)}
              variant={demo ? 'contained' : 'outlined'}
              sx={{
                justifyContent: 'flex-start',
                textTransform: 'none',
                py: 1.1,
                px: 1.5,
                borderColor: dark ? 'rgba(255,255,255,0.2)' : '#ddd',
                color: demo ? '#fff' : textColor,
                bgcolor: demo ? '#FF3B30' : 'transparent',
                '&:hover': {
                  bgcolor: demo ? '#d32f2f' : dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  borderColor: dark ? 'rgba(255,255,255,0.35)' : '#999',
                },
              }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  mr: 1.5,
                  bgcolor: demo || isBoss(account.role) ? '#FF3B30' : '#6366F1',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
              >
                {label.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  {demo ? (
                    <ScienceOutlinedIcon sx={{ fontSize: 16 }} />
                  ) : (
                    <HistoryIcon sx={{ fontSize: 16, opacity: 0.7 }} />
                  )}
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'inherit' }} noWrap>
                    {demo ? '演示账号' : '最近登录'}
                    {' · '}
                    {label}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: demo ? 'rgba(255,255,255,0.85)' : muted }} noWrap>
                  {account.email || account.id}
                  {demo ? ' · 含演示商品和订单' : ` · ${roleLabel(account.role)}`}
                </Typography>
              </Box>
            </Button>
          );
        })}
      </Box>

      {options.length > 0 && (
        <Autocomplete
          sx={{ mt: 1.5 }}
          options={options}
          autoHighlight
          openOnFocus
          disabled={isLoading}
          getOptionLabel={account =>
            `${account.name || ''} ${account.email || ''} ${account.id}`.trim()
          }
          isOptionEqualToValue={(a, b) => a.id === b.id}
          noOptionsText="没有匹配的账号"
          onChange={(_, value) => {
            if (value) onSwitch(value.id);
          }}
          renderOption={(props, account) => (
            <li {...props} key={account.id}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" noWrap>
                  {account.name || account.email || account.id}
                  {isDemoAccountUser(account) ? '（演示）' : ''}
                </Typography>
                <Typography variant="caption" sx={{ color: muted }} noWrap>
                  {account.email}
                </Typography>
              </Box>
            </li>
          )}
          renderInput={params => (
            <TextField
              {...params}
              size="small"
              label="切换其他账号"
              placeholder="搜索名称或邮箱"
              sx={dark ? darkFieldSx : lightFieldSx}
            />
          )}
          slotProps={{
            paper: {
              sx: {
                bgcolor: dark ? '#1e1e1e' : '#fff',
                color: textColor,
                border: dark ? '1px solid #333' : '1px solid #eee',
              },
            },
          }}
        />
      )}

      {testOthers.length > 0 && !showTests && (
        <Button
          type="button"
          size="small"
          onClick={() => setShowTests(true)}
          sx={{ mt: 1, color: muted, textTransform: 'none' }}
        >
          当前有 {testOthers.length} 个测试账号，点击展开
        </Button>
      )}
      {showTests && testOthers.length > 0 && (
        <Chip
          size="small"
          label={`已展开 ${testOthers.length} 个测试账号`}
          onDelete={() => setShowTests(false)}
          sx={{ mt: 1, color: muted, borderColor: dark ? '#444' : '#ddd' }}
          variant="outlined"
        />
      )}
    </Box>
  );
}
