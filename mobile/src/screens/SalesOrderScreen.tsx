import React, { useState } from 'react';
import { View, StyleSheet, FlatList, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Card, useTheme, HelperText, Divider } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createSalesOrder } from '../services/ApiService';
import { showToast } from '../components/Toast';
import { getErrorMessage } from '../utils/errorUtils';
import type { AppNavigation } from '../types/navigation';

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

const SalesOrderScreen: React.FC = () => {
  const navigation = useNavigation<AppNavigation>();
  const route = useRoute<any>();
  const { colors } = useTheme();

  const preselectedCustomer = route.params?.selectedCustomer;
  const [customerName, setCustomerName] = useState(preselectedCustomer?.name || '');
  const [customerId, setCustomerId] = useState(preselectedCustomer?.id || '');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);

  const addMockItem = () => {
    setItems([...items, {
      product_id: `mock_${Date.now()}`,
      product_name: '示例商品',
      quantity: 1,
      unit_price: 99.00,
      subtotal: 99.00,
    }]);
    showToast('info', '已添加示例商品', '正式版中将从商品库选择');
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const updateQuantity = (index: number, qty: number) => {
    const newItems = [...items];
    newItems[index].quantity = qty;
    newItems[index].subtotal = qty * newItems[index].unit_price;
    setItems(newItems);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      showToast('error', '请填写客户名称');
      return;
    }
    if (items.length === 0) {
      showToast('error', '请添加至少一个商品');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        customer_id: customerId || 'walk_in',
        items: items.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
        })),
        notes,
      };

      const result = await createSalesOrder(orderData);
      showToast('success', '创建成功', `订单号: ${result.order_number}`);
      setCustomerName('');
      setCustomerId('');
      setItems([]);
      setNotes('');
    } catch (err) {
      const msg = getErrorMessage(err);
      if (msg.includes('同步队列')) {
        showToast('info', '已离线保存', '网络恢复后自动上传');
      } else {
        showToast('error', '创建失败', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderOrderItem = ({ item, index }: { item: OrderItem; index: number }) => (
    <Card style={styles.itemCard}>
      <Card.Content style={styles.itemContent}>
        <View style={styles.itemInfo}>
          <Text variant="titleSmall" style={styles.itemName}>{item.product_name}</Text>
          <Text variant="bodySmall" style={styles.itemPrice}>
            ¥{item.unit_price.toFixed(2)} × {item.quantity}
          </Text>
        </View>
        <View style={styles.itemActions}>
          <Text variant="titleMedium" style={[styles.itemSubtotal, { color: '#ef4444' }]}>
            ¥{item.subtotal.toFixed(2)}
          </Text>
          <View style={styles.qtyRow}>
            <Button
              mode="text"
              compact
              onPress={() => item.quantity > 1 && updateQuantity(index, item.quantity - 1)}
            >
              -
            </Button>
            <Text style={styles.qty}>{item.quantity}</Text>
            <Button
              mode="text"
              compact
              onPress={() => updateQuantity(index, item.quantity + 1)}
            >
              +
            </Button>
          </View>
          <Button
            mode="text"
            compact
            textColor="#ef4444"
            icon="delete"
            onPress={() => removeItem(index)}
          >
            删除
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* 表单区 */}
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <Card style={styles.formCard}>
          <Card.Content>
            <TextInput
              label="客户名称"
              value={customerName}
              onChangeText={setCustomerName}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="account" />}
            />
            {preselectedCustomer && (
              <HelperText type="info" visible>
                已从客户列表预选
              </HelperText>
            )}
            <TextInput
              label="订单备注"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              multiline
              numberOfLines={2}
              style={styles.input}
            />
          </Card.Content>
        </Card>

        {/* 商品区 */}
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>商品列表</Text>
          <View style={styles.sectionActions}>
            <Button
              mode="contained-tonal"
              compact
              icon="plus"
              onPress={addMockItem}
              style={styles.addBtn}
            >
              添加商品
            </Button>
          </View>
        </View>

        {items.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <MaterialCommunityIcons name="cart-outline" size={40} color="#ccc" />
              <Text variant="bodyMedium" style={styles.emptyText}>暂无商品</Text>
              <Text variant="bodySmall" style={styles.emptyHint}>
                点击「添加商品」或从客户管理滑动客户来下单
              </Text>
            </Card.Content>
          </Card>
        ) : (
          items.map((item, index) => (
            <View key={index} style={styles.itemWrapper}>
              {renderOrderItem({ item, index })}
            </View>
          ))
        )}
      </ScrollView>

      {/* 底部合计栏 */}
      <Card style={styles.footer}>
        <Card.Content style={styles.footerContent}>
          <View style={styles.totalRow}>
            <Text variant="bodyLarge">合计</Text>
            <Text variant="headlineSmall" style={styles.totalAmount}>
              ¥{totalAmount.toFixed(2)}
            </Text>
          </View>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || items.length === 0}
            style={styles.submitBtn}
            contentStyle={{ paddingVertical: 4 }}
          >
            {loading ? '提交中...' : '提交订单'}
          </Button>
        </Card.Content>
      </Card>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollView: {
    flex: 1,
    padding: 12,
  },
  formCard: {
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  input: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontWeight: '600',
  },
  sectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  addBtn: {
    borderRadius: 8,
  },
  itemWrapper: {
    marginBottom: 8,
  },
  itemCard: {
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  itemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontWeight: '600',
  },
  itemPrice: {
    color: '#666',
    marginTop: 2,
  },
  itemActions: {
    alignItems: 'flex-end',
    gap: 2,
  },
  itemSubtotal: {
    fontWeight: '700',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  qty: {
    fontSize: 15,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  emptyCard: {
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    color: '#999',
    marginTop: 10,
    fontWeight: '500',
  },
  emptyHint: {
    color: '#bbb',
    marginTop: 4,
    textAlign: 'center',
  },
  footer: {
    borderRadius: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  footerContent: {
    paddingVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalAmount: {
    fontWeight: '700',
    color: '#ef4444',
  },
  submitBtn: {
    borderRadius: 10,
  },
});

export default SalesOrderScreen;
