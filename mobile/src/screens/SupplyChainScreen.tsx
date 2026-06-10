import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, Button, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigation } from '../types/navigation';

const SupplyChainScreen: React.FC = () => {
  const navigation = useNavigation<AppNavigation>();
  const { colors } = useTheme();

  const menuCards = [
    {
      title: '联系人',
      description: '管理同事、客户和供应商',
      icon: 'account-group',
      color: '#6366f1',
      screen: 'Contacts',
    },
    {
      title: '创建销售单',
      description: '新建销售订单，选择商品下单',
      icon: 'clipboard-text',
      color: '#10b981',
      screen: 'SalesOrder',
    },
    {
      title: '通话记录',
      description: '查看历史语音和视频通话',
      icon: 'phone-log',
      color: '#8b5cf6',
      screen: 'CallHistory',
    },
    {
      title: '库存概览',
      description: '查看商品库存状态',
      icon: 'warehouse',
      color: '#f59e0b',
      screen: 'Inventory',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        快捷操作
      </Text>

      {menuCards.map((item, index) => (
        <Card
          key={index}
          style={styles.card}
          onPress={() => {
            if (item.screen) {
              (navigation.navigate as any)(item.screen);
            }
          }}
        >
          <Card.Content style={styles.cardContent}>
            <View style={[styles.iconBox, { backgroundColor: item.color + '18' }]}>
              <MaterialCommunityIcons
                name={item.icon}
                size={28}
                color={item.color}
              />
            </View>
            <View style={styles.cardText}>
              <Text variant="titleMedium" style={styles.cardTitle}>
                {item.title}
              </Text>
              <Text variant="bodySmall" style={styles.cardDesc}>
                {item.description}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
          </Card.Content>
        </Card>
      ))}

      <View style={styles.tipBox}>
        <MaterialCommunityIcons name="information" size={18} color={colors.primary} />
        <Text variant="bodySmall" style={styles.tipText}>
          供应链数据与桌面端实时同步，离线模式下操作将在恢复连接后自动上传
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: '600',
  },
  cardDesc: {
    color: '#999',
    marginTop: 2,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
    borderRadius: 10,
    padding: 14,
    marginTop: 20,
  },
  tipText: {
    color: '#3730a3',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
});

export default SupplyChainScreen;
