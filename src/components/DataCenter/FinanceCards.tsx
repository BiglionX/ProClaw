import {
  Box,
  Card,
  CardContent,
  Typography,
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  Assessment as ReportIcon,
} from '@mui/icons-material';

interface FinanceCardsProps {
  accountsReceivable: number;
  accountsPayable: number;
  workingCapital: number;
  formatCurrency: (value: number) => string;
}

export default function FinanceCards({
  accountsReceivable, accountsPayable, workingCapital, formatCurrency,
}: FinanceCardsProps) {
  const ratio = accountsPayable > 0
    ? (accountsReceivable / accountsPayable).toFixed(1)
    : 'N/A';
  const isHealthy = typeof ratio === 'string' ? false : parseFloat(ratio) > 1;

  const cards = [
    {
      label: '应收',
      value: accountsReceivable,
      icon: <MoneyIcon />,
      color: '#10B981',
      gradient: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.02) 100%)',
    },
    {
      label: '应付',
      value: accountsPayable,
      icon: <MoneyIcon />,
      color: '#EF4444',
      gradient: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.02) 100%)',
    },
    {
      label: '营运',
      value: workingCapital,
      icon: <ReportIcon />,
      color: '#6366F1',
      gradient: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0.02) 100%)',
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#1A1A2E', fontSize: '0.95rem' }}>
          📊 财务快照
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {cards.map((card) => (
          <Card
            key={card.label}
            elevation={0}
            sx={{
              flex: '1 1 180px',
              minWidth: 160,
              borderRadius: 2,
              border: '1px solid rgba(0,0,0,0.06)',
              background: card.gradient,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
              },
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: `${card.color}15`,
                    color: card.color,
                  }}
                >
                  {card.icon}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                  {card.label}
                </Typography>
              </Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: card.color,
                  fontSize: '1.3rem',
                }}
              >
                {formatCurrency(card.value)}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* AI 评价 */}
      <Box
        sx={{
          mt: 1.5,
          px: 2,
          py: 1.25,
          borderRadius: 1.5,
          backgroundColor: 'rgba(99,102,241,0.05)',
          border: '1px solid rgba(99,102,241,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Typography sx={{ fontSize: '0.85rem', color: '#6366F1' }}>✨</Typography>
        <Typography variant="body2" sx={{ color: '#4B5563', fontSize: '0.8rem' }}>
          应收/应付比 {ratio}x，现金流{isHealthy ? '健康' : '需关注'}
        </Typography>
      </Box>
    </Box>
  );
}
