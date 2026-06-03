/**
 * 餐厅工作流插件 — 前端入口
 *
 * 当插件激活时，ProClaw 会执行此文件以注册 React 路由组件。
 * 使用全局 ProClawPlugin API（PRD v10.0 规范）。
 */

(function () {
  'use strict';

  // ============ 桌台管理组件 ============
  function TablesPage() {
    const [tables, setTables] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
      loadTables();
    }, []);

    async function loadTables() {
      try {
        const result = await ProClawPlugin.db.query(
          'SELECT * FROM catering_tables ORDER BY table_number'
        );
        setTables(result || []);
      } catch (err) {
        console.error('加载桌台数据失败:', err);
      } finally {
        setLoading(false);
      }
    }

    if (loading) return React.createElement('div', null, '加载桌台数据...');

    return React.createElement('div', { className: 'catering-tables' },
      React.createElement('h2', null, '桌台管理'),
      React.createElement('div', { className: 'table-grid', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' } },
        tables.map(function (table) {
          const statusColors = {
            available: '#10b981',
            occupied: '#e74c3c',
            reserved: '#f59e0b',
            cleaning: '#6b7280'
          };
          return React.createElement('div', {
            key: table.id,
            style: {
              border: '2px solid ' + (statusColors[table.status] || '#d1d5db'),
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              cursor: 'pointer'
            }
          },
            React.createElement('div', { style: { fontSize: '2rem' } }, '🍽️'),
            React.createElement('h3', { style: { margin: '8px 0' } }, '桌号 ' + table.table_number),
            React.createElement('p', { style: { color: '#6b7280', fontSize: '0.875rem' } },
              '容量: ' + table.capacity + '人'
            ),
            React.createElement('span', {
              style: {
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                color: '#fff',
                backgroundColor: statusColors[table.status] || '#d1d5db'
              }
            }, table.status === 'available' ? '空闲' :
              table.status === 'occupied' ? '已占用' :
              table.status === 'reserved' ? '已预订' : '清洁中')
          );
        })
      )
    );
  }

  // ============ POS 收银台组件 ============
  function PosPage() {
    const [menuItems, setMenuItems] = React.useState([]);
    const [cart, setCart] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(function () {
      loadMenu();
    }, []);

    async function loadMenu() {
      try {
        const items = await ProClawPlugin.db.query(
          'SELECT * FROM catering_menu_items WHERE is_available = 1 ORDER BY sort_order'
        );
        setMenuItems(items || []);
      } catch (err) {
        console.error('加载菜单失败:', err);
      } finally {
        setLoading(false);
      }
    }

    function addToCart(item) {
      setCart(function (prev) {
        var existing = prev.find(function (i) { return i.id === item.id; });
        if (existing) {
          return prev.map(function (i) {
            return i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i;
          });
        }
        return [...prev, { ...item, quantity: 1 }];
      });
    }

    function removeFromCart(itemId) {
      setCart(function (prev) {
        var item = prev.find(function (i) { return i.id === itemId; });
        if (item && item.quantity > 1) {
          return prev.map(function (i) {
            return i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i;
          });
        }
        return prev.filter(function (i) { return i.id !== itemId; });
      });
    }

    var total = cart.reduce(function (sum, item) {
      return sum + item.price * item.quantity;
    }, 0);

    if (loading) return React.createElement('div', null, '加载菜单...');

    return React.createElement('div', { style: { display: 'flex', gap: '24px' } },
      // 左侧菜单
      React.createElement('div', { style: { flex: 1 } },
        React.createElement('h2', null, '菜品菜单'),
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', marginTop: '12px' } },
          menuItems.map(function (item) {
            return React.createElement('div', {
              key: item.id,
              onClick: function () { addToCart(item); },
              style: {
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px',
                cursor: 'pointer',
                textAlign: 'center'
              }
            },
              React.createElement('div', { style: { fontSize: '1.5rem' } }, '🍜'),
              React.createElement('div', { style: { fontWeight: 'bold', margin: '4px 0' } }, item.name),
              React.createElement('div', { style: { color: '#e74c3c', fontWeight: 'bold' } },
                '¥' + item.price.toFixed(2)
              )
            );
          })
        )
      ),
      // 右侧购物车
      React.createElement('div', {
        style: {
          width: '300px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px'
        }
      },
        React.createElement('h3', null, '当前订单'),
        cart.length === 0
          ? React.createElement('p', { style: { color: '#9ca3af' } }, '请选择菜品')
          : React.createElement('div', null,
              cart.map(function (item) {
                return React.createElement('div', {
                  key: item.id,
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #f3f4f6'
                  }
                },
                  React.createElement('span', null, item.name),
                  React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                    React.createElement('button', {
                      onClick: function () { removeFromCart(item.id); },
                      style: { width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #d1d5db', cursor: 'pointer' }
                    }, '-'),
                    React.createElement('span', null, item.quantity),
                    React.createElement('button', {
                      onClick: function () { addToCart(item); },
                      style: { width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #d1d5db', cursor: 'pointer' }
                    }, '+'),
                    React.createElement('span', { style: { color: '#e74c3c', width: '60px', textAlign: 'right' } },
                      '¥' + (item.price * item.quantity).toFixed(2)
                    )
                  )
                );
              }),
              React.createElement('div', {
                style: {
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '2px solid #e5e7eb',
                  fontWeight: 'bold',
                  fontSize: '1.125rem'
                }
              },
                React.createElement('span', null, '合计:'),
                React.createElement('span', { style: { color: '#e74c3c' } }, '¥' + total.toFixed(2))
              ),
              React.createElement('button', {
                onClick: async function () {
                  if (cart.length === 0) return;
                  try {
                    var orderNumber = 'ORD-' + Date.now();
                    var totalAmount = cart.reduce(function (s, i) { return s + i.price * i.quantity; }, 0);
                    await ProClawPlugin.db.execute(
                      'INSERT INTO catering_orders (id, order_number, status, total_amount, final_amount, guest_count) VALUES (?1, ?2, ?3, ?4, ?5, ?6)',
                      ['order-' + Date.now(), orderNumber, 'pending', totalAmount, totalAmount, cart.length]
                    );
                    for (var i = 0; i < cart.length; i++) {
                      var item = cart[i];
                      await ProClawPlugin.db.execute(
                        'INSERT INTO catering_order_items (id, order_id, menu_item_id, menu_item_name, quantity, unit_price, subtotal) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)',
                        ['item-' + Date.now() + '-' + i, 'order-' + Date.now(), item.id, item.name, item.quantity, item.price, item.price * item.quantity]
                      );
                    }
                    setCart([]);
                    ProClawPlugin.notify('success', '订单已创建: ' + orderNumber);
                  } catch (err) {
                    ProClawPlugin.notify('error', '创建订单失败: ' + err.message);
                  }
                },
                style: {
                  width: '100%',
                  padding: '12px',
                  marginTop: '12px',
                  backgroundColor: '#e74c3c',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }
              }, '提交订单')
            )
      )
    );
  }

  // ============ 后厨显示 (KDS) 组件 ============
  function KitchenPage() {
    const [orders, setOrders] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(function () {
      loadKdsOrders();
      // 每 15 秒轮询
      var timer = setInterval(loadKdsOrders, 15000);
      return function () { clearInterval(timer); };
    }, []);

    async function loadKdsOrders() {
      try {
        var items = await ProClawPlugin.db.query(
          "SELECT oi.*, o.table_id, o.order_number FROM catering_order_items oi " +
          "JOIN catering_orders o ON oi.order_id = o.id " +
          "WHERE oi.status IN ('pending', 'preparing') " +
          "ORDER BY oi.created_at ASC"
        );
        setOrders(items || []);
      } catch (err) {
        console.error('加载后厨订单失败:', err);
      } finally {
        setLoading(false);
      }
    }

    async function markDone(itemId) {
      try {
        await ProClawPlugin.db.execute(
          "UPDATE catering_order_items SET status = 'done' WHERE id = ?1",
          [itemId]
        );
        loadKdsOrders();
        ProClawPlugin.notify('success', '菜品已完成');
      } catch (err) {
        ProClawPlugin.notify('error', '操作失败: ' + err.message);
      }
    }

    if (loading) return React.createElement('div', null, '加载后厨订单...');

    return React.createElement('div', null,
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } },
        React.createElement('h2', null, '后厨显示 (KDS)'),
        React.createElement('span', { style: { color: '#6b7280', fontSize: '0.875rem' } },
          '待处理: ' + orders.length + ' 项'
        )
      ),
      orders.length === 0
        ? React.createElement('p', { style: { color: '#9ca3af', textAlign: 'center', padding: '40px' } }, '暂无待处理的菜品')
        : React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' } },
            orders.map(function (item) {
              return React.createElement('div', {
                key: item.id,
                style: {
                  border: '2px solid ' + (item.status === 'preparing' ? '#f59e0b' : '#e5e7eb'),
                  borderRadius: '8px',
                  padding: '16px',
                  backgroundColor: item.status === 'preparing' ? '#fffbeb' : '#fff'
                }
              },
                React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  React.createElement('strong', null, item.menu_item_name),
                  React.createElement('span', { style: { fontSize: '1.25rem', fontWeight: 'bold' } },
                    'x' + item.quantity
                  )
                ),
                React.createElement('div', { style: { color: '#6b7280', fontSize: '0.8rem', marginTop: '4px' } },
                  '订单: ' + item.order_number
                ),
                React.createElement('button', {
                  onClick: function () { markDone(item.id); },
                  style: {
                    width: '100%',
                    padding: '8px',
                    marginTop: '12px',
                    backgroundColor: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }
                }, '完成')
              );
            })
          )
    );
  }

  // ============ 注册路由 ============
  try {
    ProClawPlugin.registerRoute('/pos', PosPage);
    ProClawPlugin.registerRoute('/tables', TablesPage);
    ProClawPlugin.registerRoute('/kitchen', KitchenPage);
    console.log('[Catering Plugin] 路由注册成功');
  } catch (err) {
    console.error('[Catering Plugin] 路由注册失败:', err);
  }
})();
