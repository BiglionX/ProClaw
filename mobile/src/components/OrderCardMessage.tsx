import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import type { ChatMessage } from '../services/ChatService';

interface OrderCardMessageProps {
  message: ChatMessage;
  onPress?: (orderId: string) => void;
}

interface OrderCardData {
  order_id: string;
  order_no: string;
  status: string;
  total_amount: number;
  items?: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
}

export const OrderCardMessage: React.FC<OrderCardMessageProps> = ({
  message,
  onPress,
}) => {
  // 解析订单卡片数据（ChatMessage 中通过 content 字段携带 JSON）
  const orderData: OrderCardData | null = message.content
    ? (() => {
        try {
          const parsed = JSON.parse(message.content);
          return parsed && parsed.order_id ? (parsed as OrderCardData) : null;
        } catch {
          return null;
        }
      })()
    : null;

  if (!orderData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>无效的订单卡片</Text>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'received':
        return '#10b981';
      case 'shipped':
        return '#6366f1';
      case 'draft':
        return '#f59e0b';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return '已确认';
      case 'received': return '已收货';
      case 'shipped': return '已发货';
      case 'draft': return '草稿';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(orderData.order_id)}
      activeOpacity={0.7}
    >
      {/* 订单头部 */}
      <View style={styles.header}>
        <Text style={styles.orderNo}>{orderData.order_no}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(orderData.status) }]}>
          <Text style={styles.statusText}>{getStatusText(orderData.status)}</Text>
        </View>
      </View>

      {/* 订单商品列表 */}
      {orderData.items && orderData.items.length > 0 && (
        <View style={styles.itemsContainer}>
          {orderData.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.product_name}
              </Text>
              <Text style={styles.itemQuantity}>x{item.quantity}</Text>
              <Text style={styles.itemPrice}>¥{(item.unit_price ?? 0).toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 订单总金额 */}
      <View style={styles.footer}>
        <Text style={styles.totalLabel}>总金额：</Text>
        <Text style={styles.totalAmount}>¥{(orderData.total_amount ?? 0).toFixed(2)}</Text>
      </View>

      {/* 点击查看详情 */}
      <View style={styles.action}>
        <Text style={styles.actionText}>点击查看详情 →</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderNo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',    fontWeight: 'bold',
  },
  itemsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 8,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
  },
  itemQuantity: {
    marginHorizontal: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  itemPrice: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 4,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  action: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    alignItems: 'flex-end',
  },
  actionText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    fontStyle: 'italic',
  },
});

export default OrderCardMessage;
