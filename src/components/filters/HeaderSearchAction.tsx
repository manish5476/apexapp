import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

import { Spacing, ThemeColors, Typography, UI } from '@/src/constants/theme';

type HeaderSearchActionProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit?: () => void;
  onOpenFilters?: () => void;
  filterActive?: boolean;
  filterCount?: number;
  placeholder?: string;
  theme: ThemeColors;
  style?: ViewStyle;
};

export function HeaderSearchAction({
  value,
  onChangeText,
  onSubmit,
  onOpenFilters,
  filterActive = false,
  filterCount = 0,
  placeholder = 'Search...',
  theme,
  style,
}: HeaderSearchActionProps) {
  const [isSearching, setIsSearching] = useState(Boolean(value));
  const inputRef = useRef<TextInput>(null);
  const widthAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: isSearching ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [isSearching, widthAnim]);

  const inputWidth = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 168],
  });
  const actionWidth = onOpenFilters ? 92 : 42;
  const searchRight = onOpenFilters ? 92 : 50;

  const openSearch = () => {
    setIsSearching(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const closeSearch = () => {
    onChangeText('');
    setIsSearching(false);
  };

  return (
    <View style={[styles.wrap, { width: actionWidth }, style]}>
      <Animated.View
        pointerEvents={isSearching ? 'auto' : 'none'}
        style={[
          styles.searchPill,
          {
            width: inputWidth,
            right: searchRight,
            opacity: widthAnim,
            backgroundColor: theme.bgSecondary,
            borderColor: theme.borderPrimary,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          placeholder={placeholder}
          placeholderTextColor={theme.textLabel}
          returnKeyType="search"
          style={[styles.input, { color: theme.textPrimary, fontFamily: theme.fonts.body }]}
        />
        {value.length > 0 ? (
          <TouchableOpacity onPress={() => onChangeText('')} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
          </TouchableOpacity>
        ) : null}
      </Animated.View>

      <TouchableOpacity
        style={[
          styles.iconBtn,
          { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary },
          isSearching && { borderColor: theme.accentPrimary },
        ]}
        onPress={isSearching ? closeSearch : openSearch}
        accessibilityRole="button"
        accessibilityLabel={isSearching ? 'Close search' : 'Open search'}
      >
        <Ionicons
          name={isSearching ? 'close-outline' : 'search-outline'}
          size={20}
          color={isSearching ? theme.accentPrimary : theme.textPrimary}
        />
      </TouchableOpacity>

      {onOpenFilters ? (
        <TouchableOpacity
          style={[
            styles.iconBtn,
            {
              backgroundColor: filterActive ? theme.accentPrimary : theme.bgSecondary,
              borderColor: filterActive ? theme.accentPrimary : theme.borderPrimary,
            },
          ]}
          onPress={onOpenFilters}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={filterActive ? theme.bgPrimary : theme.textPrimary}
          />
          {filterCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: theme.error, borderColor: theme.bgPrimary }]}>
              <Animated.Text style={styles.badgeText}>{filterCount > 9 ? '9+' : filterCount}</Animated.Text>
            </View>
          ) : null}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    flexShrink: 0,
    position: 'relative',
    zIndex: 20,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: UI.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: UI.borderWidth.thin,
  },
  searchPill: {
    position: 'absolute',
    height: 42,
    borderRadius: UI.borderRadius.md,
    borderWidth: UI.borderWidth.thin,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: Typography.size.md,
    paddingVertical: 0,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
});
