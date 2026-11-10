import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { getSupplierHistoryProducts } from '../../lib/purchaseService';
import {
  RECENT_PRODUCT_STORAGE_KEY,
  defaultPickerTab,
  filterPickerProducts,
  historyToPickerProduct,
  rememberRecentProductIds,
  resolveRecentProducts,
  type PickerProduct,
  type PickerTab,
} from '../../lib/purchaseProductPicker';

export interface QuickCreateProductInput {
  name: string;
  costPrice: number;
}

interface PurchaseProductPickerDialogProps {
  open: boolean;
  supplierId: string;
  supplierName?: string;
  catalog: PickerProduct[];
  onClose: () => void;
  onConfirm: (picked: PickerProduct[]) => void;
  onQuickCreate: (input: QuickCreateProductInput) => Promise<PickerProduct>;
}

function readRecentIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_PRODUCT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeRecentIds(ids: string[]) {
  try {
    localStorage.setItem(RECENT_PRODUCT_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // 浏览器禁止本地存储时，本次选择仍然可以带回采购单。
  }
}

export default function PurchaseProductPickerDialog({
  open,
  supplierId,
  supplierName,
  catalog,
  onClose,
  onConfirm,
  onQuickCreate,
}: PurchaseProductPickerDialogProps) {
  const [tab, setTab] = useState<PickerTab>('history');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Record<string, PickerProduct>>({});
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [created, setCreated] = useState<PickerProduct[]>([]);
  const [history, setHistory] = useState<PickerProduct[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createCost, setCreateCost] = useState('0');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTab(defaultPickerTab(supplierId));
    setQuery('');
    setSelected({});
    setCreated([]);
    setRecentIds(readRecentIds());
    setCreateOpen(false);
    setCreateError(null);
  }, [open, supplierId]);

  useEffect(() => {
    if (!open || !supplierId.trim()) {
      setHistory([]);
      setHistoryError(null);
      setHistoryLoading(false);
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);
    getSupplierHistoryProducts(supplierId)
      .then(rows => {
        if (!cancelled) setHistory(rows.map(historyToPickerProduct));
      })
      .catch(err => {
        if (!cancelled) {
          setHistory([]);
          setHistoryError(err instanceof Error ? err.message : '加载历史交易失败');
        }
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, supplierId]);

  const knownProducts = useMemo(() => {
    const byId = new Map<string, PickerProduct>();
    for (const product of [...created, ...catalog, ...history]) {
      if (!byId.has(product.id)) byId.set(product.id, product);
    }
    return [...byId.values()];
  }, [catalog, created, history]);

  const visibleProducts = useMemo(() => {
    const source = tab === 'history'
      ? history
      : tab === 'recent'
        ? resolveRecentProducts(recentIds, knownProducts)
        : knownProducts;
    return filterPickerProducts(source, query);
  }, [history, knownProducts, query, recentIds, tab]);

  const picked = Object.values(selected);

  const toggle = (product: PickerProduct) => {
    setSelected(prev => {
      const next = { ...prev };
      if (next[product.id]) delete next[product.id];
      else next[product.id] = product;
      return next;
    });
  };

  const confirm = () => {
    if (picked.length === 0) return;
    const nextRecent = rememberRecentProductIds(recentIds, picked.map(product => product.id));
    writeRecentIds(nextRecent);
    setRecentIds(nextRecent);
    onConfirm(picked);
  };

  const openProductsPage = () => {
    const base = window.location.href.split('#')[0];
    window.open(`${base}#/products`, '_blank', 'noopener');
  };

  const submitQuickCreate = async () => {
    const name = createName.trim();
    const costPrice = Number(createCost);
    if (!name) {
      setCreateError('请填写商品名称');
      return;
    }
    if (!Number.isFinite(costPrice) || costPrice < 0) {
      setCreateError('成本价不能为负数');
      return;
    }
    try {
      setCreating(true);
      setCreateError(null);
      const product = await onQuickCreate({ name, costPrice });
      setCreated(prev => [product, ...prev.filter(item => item.id !== product.id)]);
      setSelected(prev => ({ ...prev, [product.id]: product }));
      setCreateOpen(false);
      setCreateName('');
      setCreateCost('0');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : '新建商品失败');
    } finally {
      setCreating(false);
    }
  };

  const emptyText = tab === 'history'
    ? (supplierName ? `${supplierName} 还没有采购记录` : '这个供应商还没有采购记录')
    : tab === 'recent'
      ? '还没有最近添加的商品'
      : '没有匹配的商品';

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>选择商品{supplierName ? ` · ${supplierName}` : ''}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField
              autoFocus
              size="small"
              placeholder="搜索商品名称或编码"
              value={query}
              onChange={e => setQuery(e.target.value)}
              fullWidth
            />
            <Tabs value={tab} onChange={(_, value: PickerTab) => setTab(value)}>
              <Tab value="history" label="最近交易" />
              <Tab value="recent" label="最近使用" />
              <Tab value="all" label="全部商品" />
            </Tabs>
            {tab === 'history' && historyError && <Alert severity="error">{historyError}</Alert>}
            {tab === 'history' && historyLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 3 }}>
                <CircularProgress size={18} />
                <Typography variant="body2" color="text.secondary">正在查询该供应商买过的商品…</Typography>
              </Box>
            ) : visibleProducts.length === 0 ? (
              tab === 'history' && historyError ? null : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  {query.trim() ? '没有匹配的商品' : emptyText}
                </Typography>
              )
            ) : (
              <List dense sx={{ maxHeight: 360, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                {visibleProducts.map(product => {
                  const checked = Boolean(selected[product.id]);
                  const meta = [
                    product.code,
                    product.lastOrderDate ? `最近 ${product.lastOrderDate}` : '',
                    product.orderCount ? `${product.orderCount} 笔` : '',
                    `¥${product.unitPrice.toFixed(2)}`,
                  ].filter(Boolean).join(' · ');
                  return (
                    <ListItemButton key={product.id} onClick={() => toggle(product)} selected={checked}>
                      <Checkbox edge="start" checked={checked} tabIndex={-1} disableRipple />
                      <ListItemText primary={product.name} secondary={meta} />
                    </ListItemButton>
                  );
                })}
              </List>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={() => { setCreateError(null); setCreateOpen(true); }}>+ 新增商品</Button>
            <Button onClick={openProductsPage}>打开商品页</Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={onClose}>取消</Button>
            <Button variant="contained" onClick={confirm} disabled={picked.length === 0}>
              确定{picked.length > 0 ? `（${picked.length}）` : ''}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      <Dialog open={createOpen} onClose={() => !creating && setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>新增商品</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              先记下名称和成本价，商品会立即出现在本次选择里。要补图片和库存，用「打开商品页」。
            </Typography>
            {createError && <Alert severity="error">{createError}</Alert>}
            <TextField label="商品名称 *" value={createName} onChange={e => setCreateName(e.target.value)} fullWidth autoFocus />
            <TextField
              label="成本价"
              type="number"
              value={createCost}
              onChange={e => setCreateCost(e.target.value)}
              inputProps={{ min: 0, step: 0.01 }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={creating}>取消</Button>
          <Button variant="contained" onClick={submitQuickCreate} disabled={creating}>
            {creating ? '保存中...' : '保存并选中'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
