import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Toast, { ToastShowParams, ToastConfig } from 'react-native-toast-message';

/**
 * 统一 Toast 工具，替换原生 Alert.alert
 */
export const showToast = (
  type: 'success' | 'error' | 'info',
  title: string,
  message?: string,
  options?: Partial<ToastShowParams>
) => {
  Toast.show({
    type,
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: options?.visibilityTime ?? 2500,
    autoHide: true,
    topOffset: 60,
    ...options,
  });
};

const colorMap = {
  success: { bg: '#10b981', sub: '#d1fae5' },
  error: { bg: '#ef4444', sub: '#fee2e2' },
  info: { bg: '#6366f1', sub: '#e0e7ff' },
};

const ToastBase: React.FC<{ text1?: string; text2?: string; type: string }> = ({
  text1,
  text2,
  type,
}) => {
  const c = colorMap[type as keyof typeof colorMap] || colorMap.info;
  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {text1 ? <Text style={styles.text1}>{text1}</Text> : null}
      {text2 ? <Text style={[styles.text2, { color: c.sub }]}>{text2}</Text> : null}
    </View>
  );
};

export const toastConfig: ToastConfig = {
  success: (props) => React.createElement(ToastBase, { ...props, type: 'success' }),
  error: (props) => React.createElement(ToastBase, { ...props, type: 'error' }),
  info: (props) => React.createElement(ToastBase, { ...props, type: 'info' }),
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  text1: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  text2: {
    fontSize: 13,
    marginTop: 2,
  },
});

export default { showToast, toastConfig };
