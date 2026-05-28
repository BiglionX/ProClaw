import { useState } from 'react';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import FinanceDashboard from '../components/FinanceAgent/FinanceDashboard';
import AccountList from '../components/FinanceAgent/AccountList';
import TransactionList from '../components/FinanceAgent/TransactionList';
import BudgetPanel from '../components/FinanceAgent/BudgetPanel';
import ReportView from '../components/FinanceAgent/ReportView';
import InvoiceList from '../components/FinanceAgent/InvoiceList';

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

export default function FinanceAgentPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      {/* 页面标题 */}
      <Box sx={{ mb: 1 }}>
        <Typography variant="h5" fontWeight={700}>
          财务管理
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          内置财务管理 Agent - 记账、预算、报表、发票管理
        </Typography>
      </Box>

      {/* Tab 导航 */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 500 },
        }}
      >
        <Tab label="概览" />
        <Tab label="账户" />
        <Tab label="交易记录" />
        <Tab label="预算" />
        <Tab label="报表" />
        <Tab label="发票" />
      </Tabs>

      {/* 内容区域 */}
      <TabPanel value={tab} index={0}>
        <FinanceDashboard />
      </TabPanel>
      <TabPanel value={tab} index={1}>
        <AccountList />
      </TabPanel>
      <TabPanel value={tab} index={2}>
        <TransactionList />
      </TabPanel>
      <TabPanel value={tab} index={3}>
        <BudgetPanel />
      </TabPanel>
      <TabPanel value={tab} index={4}>
        <ReportView />
      </TabPanel>
      <TabPanel value={tab} index={5}>
        <InvoiceList />
      </TabPanel>
    </Box>
  );
}
