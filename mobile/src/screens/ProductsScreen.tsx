import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Searchbar, Card, Chip, useTheme, ActivityIndicator } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Swipeable } from 'react-native-gesture-handler';
import { getProducts, Product } from '../services/ApiService';
import { isDemoMode } from '../services/AuthService';
import { showToast } from '../components/Toast';
import { getErrorMessage } from '../utils/errorUtils';

const DEMO_PRODUCTS: Product[] = [
  { id: '1', name: 'iPhone 15 Pro', sku: 'SKU-001', price: 8999, stock_quantity: 120 },
  { id: '2', name: 'MacBook Air M3', sku: 'SKU-002', price: 10499, stock_quantity: 45 },
  { id: '3', name: 'AirPods Pro 2', sku: 'SKU-003', price: 1999, stock_quantity: 200 },
  { id: '4', name: 'iPad Air 11"', sku: 'SKU-004', price: 4799, stock_quantity: 88 },
  { id: '5', name: 'Apple Watch S9', sku: 'SKU-005', price: 3199, stock_quantity: 150 },
];

const ProductsScreen: React.FC = () => {
  const { colors } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadProducts = useCallback(async () => {
    try {
      if (await isDemoMode()) {
        const filtered = searchQuery
          ? DEMO_PRODUCTS.filter((p) =>
              p.name.toLowerCase().includes(searchQuery.toLowerCase())
            )
          : DEMO_PRODUCTS;
        setProducts(filtered);
      } else {
        const data = await getProducts({ search: searchQuery || undefined });
        setProducts(data);
      }
    } catch (err) {
      showToast('error', '加载失败', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    setLoading(true);
    loadProducts();
  }, [loadProducts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const onSearch = () => {
    setLoading(true);
    loadProducts();
  };

  // 滑动操作：右滑查看详情占位
  const renderRightActions = (item: Product) => (
    <View style={styles.swipeActions}>
      <View style={[styles.swipeAction, { backgroundColor: colors.primary }]}>
        <MaterialCommunityIcons name="pencil" size={20} color="#fff" />
        <Text style={styles.swipeActionText}>编辑</Text>
      </View>
    </View>
  );

  const renderProduct = ({ item }: { item: Product }) => (
    <Swipeable renderRightActions={() => renderRightActions(item)}>
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.primaryContainer }]}>
            <MaterialCommunityIcons name="package-variant" size={28} color={colors.primary} />
          </View>
          <View style={styles.info}>
            <Text variant="titleSmall" numberOfLines={1} style={styles.name}>
              {item.name}
            </Text>
            <Text variant="bodySmall" style={styles.sku}>SKU: {item.sku}</Text>
            <View style={styles.meta}>
              <Text variant="titleMedium" style={[styles.price, { color: '#ef4444' }]}>
                ¥{item.price.toFixed(2)}
              </Text>
              <Chip
                style={[styles.stockChip, { backgroundColor: item.stock_quantity > 0 ? '#d1fae5' : '#fee2e2' }]}
                textStyle={{ fontSize: 11, color: item.stock_quantity > 0 ? '#065f46' : '#991b1b', fontWeight: '600' }}
              >
                {item.stock_quantity > 0 ? `库存 ${item.stock_quantity}` : '缺货'}
              </Chip>
            </View>
          </View>
        </Card.Content>
      </Card>
    </Swipeable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Searchbar
          placeholder="搜索商品名称或SKU"
          onChangeText={setSearchQuery}
          value={searchQuery}
          onSubmitEditing={onSearch}
          onIconPress={onSearch}
          style={styles.searchInput}
          inputStyle={{ fontSize: 14 }}
        />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="package-variant-closed" size={56} color="#ddd" />
              <Text variant="bodyLarge" style={styles.emptyText}>暂无商品</Text>
              <Text variant="bodySmall" style={styles.emptyHint}>请在桌面端添加商品信息</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  searchBar: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    borderRadius: 10,
    elevation: 0,
    backgroundColor: '#f5f5f5',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 12,
  },
  card: {
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontWeight: '600',
    marginBottom: 2,
  },
  sku: {
    color: '#999',
    marginBottom: 6,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontWeight: '700',
  },
  stockChip: {
    height: 24,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    color: '#999',
    marginTop: 16,
    fontWeight: '500',
  },
  emptyHint: {
    color: '#bbb',
    marginTop: 6,
  },
  swipeActions: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  swipeAction: {
    width: 72,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    gap: 4,
  },
  swipeActionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});

export default ProductsScreen;
