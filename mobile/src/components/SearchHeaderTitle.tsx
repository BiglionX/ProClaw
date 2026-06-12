/**
 * SearchHeaderTitle - 可滑入搜索框的 Header 标题组件
 *
 * v21 简化：去掉 position:absolute + Animated.Text 复杂定位，改用条件渲染
 * - isSearching=false：纯文字标题"消息/联系人"
 * - isSearching=true：搜索输入框（带 250ms 淡入动画）
 *
 * 为什么重写：
 *   旧版用 absolute + translateX，导致在 Tab header 容器中 width 撑不开，
 *   "消息/联系人" 标题文字渲染后被裁剪为不可见。
 *   ContactsTab 和 MessagesTab 两个屏幕都受影响。
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, Animated, StyleSheet, Text } from 'react-native';

interface SearchHeaderTitleProps {
  title: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing: () => void;
  isSearching: boolean;
}

export default function SearchHeaderTitle({
  title,
  placeholder,
  value,
  onChangeText,
  onSubmitEditing,
  isSearching,
}: SearchHeaderTitleProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  // 250ms 淡入 / 淡出
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isSearching ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      if (isSearching) inputRef.current?.focus();
    });
  }, [isSearching, fadeAnim]);

  return (
    <View style={styles.container}>
      {/* 标题：isSearching=false 时完全不透明显示 */}
      <Animated.View
        style={[
          styles.layer,
          styles.titleLayer,
          { opacity: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
        ]}
        pointerEvents={isSearching ? 'none' : 'auto'}
      >
        <Text style={styles.titleText} numberOfLines={1}>
          {title}
        </Text>
      </Animated.View>

      {/* 搜索框：isSearching=true 时淡入 */}
      <Animated.View
        style={[
          styles.layer,
          styles.searchLayer,
          { opacity: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) },
        ]}
        pointerEvents={isSearching ? 'auto' : 'none'}
      >
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmitEditing}
          returnKeyType="search"
          selectionColor="#fff"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    // 关键：让 header 容器给它分配实际宽度
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  titleLayer: {
    alignItems: 'flex-start',
  },
  titleText: {
    color: '#fff',
    fontWeight: 'bold' as const,
    fontSize: 18,
  },
  searchLayer: {
    paddingRight: 4,
  },
  searchInput: {
    width: '100%',
    color: '#fff',
    fontSize: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    height: 36,
  },
});
