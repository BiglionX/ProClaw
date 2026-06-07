/**
 * SearchHeaderTitle - 可滑入搜索框的 Header 标题组件
 *
 * 标题文字始终固定可见，搜索框以覆盖层形式从右侧滑入盖住标题行。
 * 收起时搜索 DOM 完全移除，标题不受任何挤压或位移。
 * 3 秒无输入自动收回的逻辑由父组件控制。
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, Animated, StyleSheet } from 'react-native';

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
  const slideAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);
  const [renderSearch, setRenderSearch] = useState(false);

  useEffect(() => {
    if (isSearching) {
      setRenderSearch(true);
      const raf = requestAnimationFrame(() => {
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          inputRef.current?.focus();
        });
      });
      return () => cancelAnimationFrame(raf);
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setRenderSearch(false);
      });
    }
  }, [isSearching, slideAnim]);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  return (
    <View style={styles.container}>
      {/* 标题文字：始终渲染，固定在原位，不受搜索框影响 */}
      <View style={styles.titleContainer}>
        <Animated.Text style={styles.titleText}>{title}</Animated.Text>
      </View>

      {/* 搜索框覆盖层：展开时才渲染，从右侧滑入盖住标题 */}
      {renderSearch && (
        <Animated.View
          style={[styles.searchOverlay, { transform: [{ translateX }] }]}
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    marginLeft: -8,
  },
  titleContainer: {
    position: 'absolute',
    left: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  titleText: {
    color: '#fff',
    fontWeight: 'bold' as const,
    fontSize: 18,
  },
  searchOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingLeft: 8,
    paddingRight: 4,
    backgroundColor: '#6366f1',
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    height: 36,
  },
});
