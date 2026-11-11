import {
  Add as AddIcon,
  Business as BusinessIcon,
  Edit as EditIcon,
  People as CustomerIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import {
  useInvalidatePurchase,
  usePurchaseOrders,
  usePurchaseReturns,
  useSuppliers,
} from '../../lib/hooks/usePurchase';
import { useCustomers, useSalesOrders, useSalesReturns, useInvalidateSales } from '../../lib/hooks/useSales';
import {
  createSupplier,
  generateSupplierCode,
  updateSupplier,
  type PurchaseOrder,
  type Supplier,
} from '../../lib/purchaseService';
import type { PurchaseReturn } from '../../lib/purchaseReturnService';
import {
  createCustomer,
  generateCustomerCode,
  updateCustomer,
  type Customer,
  type SalesOrder,
} from '../../lib/salesService';
import type { SalesReturn } from '../../lib/salesReturnService';

const PO_STATUS: Record<string, string> = {
  draft: '草稿',
  confirmed: '已确认',
  shipped: '已发货',
  received: '已收货',
  cancelled: '已取消',
};
const SO_STATUS: Record<string, string> = {
  draft: '草稿',
  confirmed: '已确认',
  shipped: '已发货',
  delivered: '已送达',
  cancelled: '已取消',
};
const PAY_STATUS: Record<string, string> = {
  unpaid: '未付',
  partial: '部分付款',
  paid: '已付清',
};
const RETURN_STATUS: Record<string, string> = {
  draft: '草稿',
  confirmed: '已确认',
  completed: '已完成',
  cancelled: '已取消',
};

function money(n: number) {
  return `¥${(n || 0).toFixed(2)}`;
}

interface LedgerLine {
  date: string;
  docNo: string;
  kind: string;
  debit: number;
  credit: number;
  balance: number;
}

function buildLedger(
  charges: Array<{ date: string; docNo: string; amount: number; cancelled: boolean; paid: number }>,
  credits: Array<{ date: string; docNo: string; amount: number; cancelled: boolean }>,
  chargeKind: string,
  payKind: string,
  creditKind: string,
): LedgerLine[] {
  const raw: Array<Omit<LedgerLine, 'balance'>> = [];
  for (const row of charges) {
    if (row.cancelled) continue;
    raw.push({ date: row.date || '', docNo: row.docNo, kind: chargeKind, debit: row.amount, credit: 0 });
    if (row.paid > 0) {
      raw.push({ date: row.date || '', docNo: row.docNo, kind: payKind, debit: 0, credit: row.paid });
    }
  }
  for (const row of credits) {
    if (row.cancelled) continue;
    raw.push({ date: row.date || '', docNo: row.docNo, kind: creditKind, debit: 0, credit: row.amount });
  }
  raw.sort((a, b) => a.date.localeCompare(b.date) || a.docNo.localeCompare(b.docNo) || a.kind.localeCompare(b.kind));
  let balance = 0;
  return raw.map((line) => {
    balance += line.debit - line.credit;
    return { ...line, balance };
  });
}

function SummaryCards({
  docsLabel,
  docCount,
  totalLabel,
  total,
  paidLabel,
  paid,
  openLabel,
  open,
}: {
  docsLabel: string;
  docCount: number;
  totalLabel: string;
  total: number;
  paidLabel: string;
  paid: number;
  openLabel: string;
  open: number;
}) {
  const cards = [
    [docsLabel, String(docCount)],
    [totalLabel, money(total)],
    [paidLabel, money(paid)],
    [openLabel, money(open)],
  ];
  return (
    <Grid container spacing={1.5} sx={{ mb: 2 }}>
      {cards.map(([label, value]) => (
        <Grid item xs={6} sm={3} key={label}>
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="h6">{value}</Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}

function LedgerTable({ lines, empty }: { lines: LedgerLine[]; empty: string }) {
  if (lines.length === 0) {
    return <Typography color="text.secondary" sx={{ py: 2 }}>{empty}</Typography>;
  }
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>日期</TableCell>
            <TableCell>单据</TableCell>
            <TableCell>摘要</TableCell>
            <TableCell align="right">增加</TableCell>
            <TableCell align="right">减少</TableCell>
            <TableCell align="right">余额</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lines.map((line, i) => (
            <TableRow key={`${line.docNo}-${line.kind}-${i}`}>
              <TableCell>{line.date.slice(0, 10)}</TableCell>
              <TableCell>{line.docNo}</TableCell>
              <TableCell>{line.kind}</TableCell>
              <TableCell align="right">{line.debit ? money(line.debit) : '—'}</TableCell>
              <TableCell align="right">{line.credit ? money(line.credit) : '—'}</TableCell>
              <TableCell align="right">{money(line.balance)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function SupplierDetailDialog({
  supplier,
  orders,
  returns,
  onClose,
}: {
  supplier: Supplier;
  orders: PurchaseOrder[];
  returns: PurchaseReturn[];
  onClose: () => void;
}) {
  const [section, setSection] = useState(0);
  const mine = orders.filter((o) => o.supplier_id === supplier.id);
  const myReturns = returns.filter((r) => r.supplier_id === supplier.id);
  const active = mine.filter((o) => o.status !== 'cancelled');
  const total = active.reduce((s, o) => s + (o.total_amount || 0), 0);
  const paid = active.reduce((s, o) => s + (o.paid_amount || 0), 0);
  const returned = myReturns.filter((r) => r.status !== 'cancelled').reduce((s, r) => s + (r.total_amount || 0), 0);
  const lines = useMemo(
    () =>
      buildLedger(
        mine.map((o) => ({
          date: o.order_date,
          docNo: o.po_number,
          amount: o.total_amount || 0,
          cancelled: o.status === 'cancelled',
          paid: o.paid_amount || 0,
        })),
        myReturns.map((r) => ({
          date: r.return_date,
          docNo: r.pr_number,
          amount: r.total_amount || 0,
          cancelled: r.status === 'cancelled',
        })),
        '采购',
        '付款',
        '退货',
      ),
    [mine, myReturns],
  );

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {supplier.name}
        <Typography variant="body2" color="text.secondary">
          {supplier.code || '无编码'}
          {supplier.contact_person ? ` · ${supplier.contact_person}` : ''}
          {supplier.phone ? ` · ${supplier.phone}` : ''}
          {supplier.payment_terms ? ` · ${supplier.payment_terms}` : ''}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <SummaryCards
          docsLabel="采购单"
          docCount={active.length}
          totalLabel="采购金额"
          total={total}
          paidLabel="已付"
          paid={paid}
          openLabel="未结应付"
          open={total - paid - returned}
        />
        <Tabs value={section} onChange={(_, v) => setSection(v)} sx={{ mb: 1 }}>
          <Tab label={`采购单 (${mine.length})`} />
          <Tab label={`退货 (${myReturns.length})`} />
          <Tab label="对账单" />
        </Tabs>
        {section === 0 && (
          mine.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>这个供应商还没有采购单。</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>采购单</TableCell>
                    <TableCell>日期</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>付款</TableCell>
                    <TableCell align="right">金额</TableCell>
                    <TableCell align="right">已付</TableCell>
                    <TableCell align="right">未付</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mine.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>{o.po_number}</TableCell>
                      <TableCell>{(o.order_date || '').slice(0, 10)}</TableCell>
                      <TableCell><Chip size="small" label={PO_STATUS[o.status] || o.status} /></TableCell>
                      <TableCell><Chip size="small" label={PAY_STATUS[o.payment_status] || o.payment_status} /></TableCell>
                      <TableCell align="right">{money(o.total_amount)}</TableCell>
                      <TableCell align="right">{money(o.paid_amount)}</TableCell>
                      <TableCell align="right">{money(Math.max((o.total_amount || 0) - (o.paid_amount || 0), 0))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )
        )}
        {section === 1 && (
          myReturns.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>没有采购退货。</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>退货单</TableCell>
                    <TableCell>原采购单</TableCell>
                    <TableCell>日期</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell align="right">金额</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {myReturns.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.pr_number}</TableCell>
                      <TableCell>{r.po_number || '—'}</TableCell>
                      <TableCell>{(r.return_date || '').slice(0, 10)}</TableCell>
                      <TableCell><Chip size="small" label={RETURN_STATUS[r.status] || r.status} /></TableCell>
                      <TableCell align="right">{money(r.total_amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )
        )}
        {section === 2 && (
          <LedgerTable lines={lines} empty="没有可对账的采购、付款或退货。" />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}

function CustomerDetailDialog({
  customer,
  orders,
  returns,
  onClose,
}: {
  customer: Customer;
  orders: SalesOrder[];
  returns: SalesReturn[];
  onClose: () => void;
}) {
  const [section, setSection] = useState(0);
  const mine = orders.filter((o) => o.customer_id === customer.id);
  const myReturns = returns.filter((r) => r.customer_id === customer.id);
  const active = mine.filter((o) => o.status !== 'cancelled');
  const total = active.reduce((s, o) => s + (o.total_amount || 0), 0);
  const paid = active.reduce((s, o) => s + (o.paid_amount || 0), 0);
  const returned = myReturns.filter((r) => r.status !== 'cancelled').reduce((s, r) => s + (r.total_amount || 0), 0);
  const lines = useMemo(
    () =>
      buildLedger(
        mine.map((o) => ({
          date: o.order_date,
          docNo: o.so_number,
          amount: o.total_amount || 0,
          cancelled: o.status === 'cancelled',
          paid: o.paid_amount || 0,
        })),
        myReturns.map((r) => ({
          date: r.return_date,
          docNo: r.sr_number,
          amount: r.total_amount || 0,
          cancelled: r.status === 'cancelled',
        })),
        '销售',
        '收款',
        '退货',
      ),
    [mine, myReturns],
  );

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {customer.name}
        <Typography variant="body2" color="text.secondary">
          {customer.code || '无编码'}
          {customer.contact_person ? ` · ${customer.contact_person}` : ''}
          {customer.phone ? ` · ${customer.phone}` : ''}
          {customer.customer_type === 'company' ? ' · 企业' : ' · 个人'}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <SummaryCards
          docsLabel="销售单"
          docCount={active.length}
          totalLabel="销售金额"
          total={total}
          paidLabel="已收"
          paid={paid}
          openLabel="未结应收"
          open={total - paid - returned}
        />
        <Tabs value={section} onChange={(_, v) => setSection(v)} sx={{ mb: 1 }}>
          <Tab label={`销售单 (${mine.length})`} />
          <Tab label={`退货 (${myReturns.length})`} />
          <Tab label="对账单" />
        </Tabs>
        {section === 0 && (
          mine.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>这个客户还没有销售单。</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>销售单</TableCell>
                    <TableCell>日期</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>收款</TableCell>
                    <TableCell align="right">金额</TableCell>
                    <TableCell align="right">已收</TableCell>
                    <TableCell align="right">未收</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mine.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>{o.so_number}</TableCell>
                      <TableCell>{(o.order_date || '').slice(0, 10)}</TableCell>
                      <TableCell><Chip size="small" label={SO_STATUS[o.status] || o.status} /></TableCell>
                      <TableCell><Chip size="small" label={PAY_STATUS[o.payment_status] || o.payment_status} /></TableCell>
                      <TableCell align="right">{money(o.total_amount)}</TableCell>
                      <TableCell align="right">{money(o.paid_amount)}</TableCell>
                      <TableCell align="right">{money(Math.max((o.total_amount || 0) - (o.paid_amount || 0), 0))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )
        )}
        {section === 1 && (
          myReturns.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>没有销售退货。</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>退货单</TableCell>
                    <TableCell>原销售单</TableCell>
                    <TableCell>日期</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell align="right">金额</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {myReturns.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.sr_number}</TableCell>
                      <TableCell>{r.so_number || '—'}</TableCell>
                      <TableCell>{(r.return_date || '').slice(0, 10)}</TableCell>
                      <TableCell><Chip size="small" label={RETURN_STATUS[r.status] || r.status} /></TableCell>
                      <TableCell align="right">{money(r.total_amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )
        )}
        {section === 2 && (
          <LedgerTable lines={lines} empty="没有可对账的销售、收款或退货。" />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}

export function SupplierManagePanel({
  setError,
  setSuccessMessage,
}: {
  setError: (e: string | null) => void;
  setSuccessMessage: (e: string | null) => void;
}) {
  const invalidate = useInvalidatePurchase();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const emptyForm = () => ({
    name: '', code: generateSupplierCode(), contact_person: '', phone: '', email: '',
    address: '', website: '', payment_terms: '月结30天', tax_number: '', notes: '', is_active: true,
  });
  const [form, setForm] = useState(emptyForm);
  const { data: suppliers = [], isLoading } = useSuppliers(query, true);
  const { data: orders = [] } = usePurchaseOrders('', true);
  const { data: returns = [] } = usePurchaseReturns('', true);

  const submit = async () => {
    if (!form.name.trim()) {
      setError('供应商名称不能为空');
      return;
    }
    try {
      if (editing) {
        await updateSupplier(editing.id, form);
        setSuccessMessage('供应商资料已保存');
        setEditing(null);
      } else {
        await createSupplier(form);
        setSuccessMessage('供应商已添加');
        setAdding(false);
      }
      setForm(emptyForm());
      invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加供应商失败');
    }
  };

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          placeholder="搜索供应商（名称 / 编码 / 联系人）"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setQuery(search)}
          size="small"
          sx={{ minWidth: 280 }}
          InputProps={{ endAdornment: <Button size="small" onClick={() => setQuery(search)}><SearchIcon /></Button> }}
        />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setForm(emptyForm()); setAdding(true); }}>添加供应商</Button>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { setQuery(search); invalidate(); }}>刷新</Button>
      </Paper>
      <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
          <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">供应商（{suppliers.length}）</Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>编码</TableCell>
                <TableCell>名称</TableCell>
                <TableCell>联系人</TableCell>
                <TableCell>电话</TableCell>
                <TableCell>付款条件</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">{isLoading ? '加载中...' : '暂无供应商'}</Typography>
                  </TableCell>
                </TableRow>
              ) : suppliers.map((s) => (
                <TableRow key={s.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelected(s)}>
                  <TableCell><Typography sx={{ fontWeight: 'bold', color: 'primary.main' }}>{s.code || '—'}</Typography></TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.contact_person || '—'}</TableCell>
                  <TableCell>{s.phone || '—'}</TableCell>
                  <TableCell>{s.payment_terms || '—'}</TableCell>
                  <TableCell>{s.is_active ? '活跃' : '停用'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      aria-label="编辑供应商"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAdding(false);
                        setEditing(s);
                        setForm({
                          name: s.name,
                          code: s.code || '',
                          contact_person: s.contact_person || '',
                          phone: s.phone || '',
                          email: s.email || '',
                          address: s.address || '',
                          website: s.website || '',
                          payment_terms: s.payment_terms || '',
                          tax_number: s.tax_number || '',
                          notes: s.notes || '',
                          is_active: s.is_active,
                        });
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      {selected && (
        <SupplierDetailDialog
          supplier={selected}
          orders={orders}
          returns={returns}
          onClose={() => setSelected(null)}
        />
      )}
      <Dialog open={adding || editing != null} onClose={() => { setAdding(false); setEditing(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? '编辑供应商' : '添加供应商'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required fullWidth />
            <TextField label="编码" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} fullWidth />
            <TextField label="联系人" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} fullWidth />
            <TextField label="电话" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} fullWidth />
            <TextField label="邮箱" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth />
            <TextField label="地址" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} fullWidth />
            <TextField label="网站" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} fullWidth />
            <TextField label="税号" value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} fullWidth />
            <TextField label="付款条件" value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} fullWidth />
            <TextField label="备注" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} multiline rows={2} fullWidth />
            <FormControl fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                label="状态"
                value={form.is_active ? 'active' : 'inactive'}
                onChange={(e) => setForm({ ...form, is_active: e.target.value === 'active' })}
              >
                <MenuItem value="active">活跃</MenuItem>
                <MenuItem value="inactive">停用</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAdding(false); setEditing(null); }}>取消</Button>
          <Button variant="contained" onClick={() => void submit()}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export function CustomerManagePanel({
  setError,
  setSuccessMessage,
}: {
  setError: (e: string | null) => void;
  setSuccessMessage: (e: string | null) => void;
}) {
  const invalidate = useInvalidateSales();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const emptyForm = () => ({
    name: '', code: generateCustomerCode(), contact_person: '', phone: '', email: '',
    address: '', website: '', customer_type: 'company' as 'company' | 'individual',
    tax_number: '', credit_limit: 0, notes: '', is_active: true,
  });
  const [form, setForm] = useState(emptyForm);
  const { data: customers = [], isLoading } = useCustomers(query, true);
  const { data: orders = [] } = useSalesOrders({}, true);
  const { data: returns = [] } = useSalesReturns('', true);

  const submit = async () => {
    if (!form.name.trim()) {
      setError('客户名称不能为空');
      return;
    }
    try {
      if (editing) {
        await updateCustomer(editing.id, form);
        setSuccessMessage('客户资料已保存');
        setEditing(null);
      } else {
        await createCustomer(form);
        setSuccessMessage('客户已添加');
        setAdding(false);
      }
      setForm(emptyForm());
      invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加客户失败');
    }
  };

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          placeholder="搜索客户（名称 / 编码 / 联系人）"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setQuery(search)}
          size="small"
          sx={{ minWidth: 280 }}
          InputProps={{ endAdornment: <Button size="small" onClick={() => setQuery(search)}><SearchIcon /></Button> }}
        />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setForm(emptyForm()); setAdding(true); }}>添加客户</Button>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { setQuery(search); invalidate(); }}>刷新</Button>
      </Paper>
      <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
          <CustomerIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">客户（{customers.length}）</Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>编码</TableCell>
                <TableCell>名称</TableCell>
                <TableCell>联系人</TableCell>
                <TableCell>电话</TableCell>
                <TableCell>类型</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">{isLoading ? '加载中...' : '暂无客户'}</Typography>
                  </TableCell>
                </TableRow>
              ) : customers.map((c) => (
                <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelected(c)}>
                  <TableCell><Typography sx={{ fontWeight: 'bold', color: 'primary.main' }}>{c.code || '—'}</Typography></TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.contact_person || '—'}</TableCell>
                  <TableCell>{c.phone || '—'}</TableCell>
                  <TableCell>{c.customer_type === 'company' ? '企业' : '个人'}</TableCell>
                  <TableCell>{c.is_active ? '活跃' : '停用'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      aria-label="编辑客户"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAdding(false);
                        setEditing(c);
                        setForm({
                          name: c.name,
                          code: c.code || '',
                          contact_person: c.contact_person || '',
                          phone: c.phone || '',
                          email: c.email || '',
                          address: c.address || '',
                          website: c.website || '',
                          customer_type: c.customer_type === 'individual' ? 'individual' : 'company',
                          tax_number: c.tax_number || '',
                          credit_limit: c.credit_limit || 0,
                          notes: c.notes || '',
                          is_active: c.is_active,
                        });
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      {selected && (
        <CustomerDetailDialog
          customer={selected}
          orders={orders}
          returns={returns}
          onClose={() => setSelected(null)}
        />
      )}
      <Dialog open={adding || editing != null} onClose={() => { setAdding(false); setEditing(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? '编辑客户' : '添加客户'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required fullWidth />
            <TextField label="编码" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} fullWidth />
            <TextField label="联系人" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} fullWidth />
            <TextField label="电话" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} fullWidth />
            <TextField label="邮箱" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth />
            <TextField label="地址" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} fullWidth />
            <TextField label="网站" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} fullWidth />
            <TextField label="税号" value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} fullWidth />
            <TextField label="信用额度" type="number" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: parseFloat(e.target.value) || 0 })} fullWidth />
            <FormControl fullWidth>
              <InputLabel>类型</InputLabel>
              <Select
                label="类型"
                value={form.customer_type}
                onChange={(e) => setForm({ ...form, customer_type: e.target.value as 'company' | 'individual' })}
              >
                <MenuItem value="company">企业</MenuItem>
                <MenuItem value="individual">个人</MenuItem>
              </Select>
            </FormControl>
            <TextField label="备注" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} multiline rows={2} fullWidth />
            <FormControl fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                label="状态"
                value={form.is_active ? 'active' : 'inactive'}
                onChange={(e) => setForm({ ...form, is_active: e.target.value === 'active' })}
              >
                <MenuItem value="active">活跃</MenuItem>
                <MenuItem value="inactive">停用</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAdding(false); setEditing(null); }}>取消</Button>
          <Button variant="contained" onClick={() => void submit()}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
