/**
 * AppSearchBar.tsx — Animated search input with filter button
 * AppListItem.tsx  — Rich list row (title, subtitle, meta, badge, avatar, swipe)
 * AppEmptyState.tsx — Empty / error state illustration
 * AppLoader.tsx    — Full-screen and inline loading states
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

// ─────────────────────────────────────────
// AppSearchBar
// ─────────────────────────────────────────
interface AppSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFilter?: () => void;
  filterActive?: boolean;
  onClear?: () => void;
  style?: ViewStyle;
}

export const AppSearchBar: React.FC<AppSearchBarProps> = ({
  value, onChangeText, placeholder = 'Search…',
  onFilter, filterActive, onClear, style,
}) => {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };
  const onBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const borderColor = borderAnim.interpolate({ inputRange: [0, 1], outputRange: ['#2E2E4A', '#6C63FF'] });

  return (
    <View style={[searchStyles.row, style]}>
      <Animated.View style={[searchStyles.container, { borderColor }]}>
        <Ionicons name="search-outline" size={18} color={focused ? '#6C63FF' : '#6B6B8A'} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#4A4A6A"
          style={searchStyles.input}
          onFocus={onFocus}
          onBlur={onBlur}
          returnKeyType="search"
          selectionColor="#6C63FF"
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => { onChangeText(''); onClear?.(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color="#6B6B8A" />
          </TouchableOpacity>
        )}
      </Animated.View>
      {onFilter && (
        <TouchableOpacity
          style={[searchStyles.filterBtn, filterActive && searchStyles.filterBtnActive]}
          onPress={onFilter}
        >
          <Ionicons name="options-outline" size={18} color={filterActive ? '#fff' : '#6C63FF'} />
          {filterActive && <View style={searchStyles.filterDot} />}
        </TouchableOpacity>
      )}
    </View>
  );
};

const searchStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  container: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#12122A', borderWidth: 1.5, borderRadius: 14,
    paddingHorizontal: 14, height: 48,
  },
  input: { flex: 1, color: '#E8E8FF', fontSize: 15, fontWeight: '500' },
  filterBtn: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#6C63FF22', borderWidth: 1.5, borderColor: '#6C63FF',
    justifyContent: 'center', alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: '#6C63FF' },
  filterDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF4C6A', position: 'absolute', top: 8, right: 8, borderWidth: 1.5, borderColor: '#12122A' },
});


// ─────────────────────────────────────────
// AppListItem
// ─────────────────────────────────────────
interface AppListItemProps {
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: string;
  badgeColor?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  leftIconColor?: string;
  avatar?: React.ReactNode;
  rightValue?: string;
  rightValueColor?: string;
  onPress?: () => void;
  showChevron?: boolean;
  style?: ViewStyle;
}

export const AppListItem: React.FC<AppListItemProps> = ({
  title, subtitle, meta, badge, badgeColor = '#6C63FF',
  leftIcon, leftIconColor = '#6C63FF', avatar,
  rightValue, rightValueColor = '#E8E8FF',
  onPress, showChevron = !!onPress, style,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      onPressIn={() => onPress && Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 30 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start()}
      activeOpacity={1}
    >
      <Animated.View style={[listStyles.container, { transform: [{ scale }] }, style]}>
        {/* Left */}
        {avatar ? (
          <View style={listStyles.leftSlot}>{avatar}</View>
        ) : leftIcon ? (
          <View style={[listStyles.iconBox, { backgroundColor: leftIconColor + '22' }]}>
            <Ionicons name={leftIcon} size={18} color={leftIconColor} />
          </View>
        ) : null}

        {/* Content */}
        <View style={listStyles.content}>
          <View style={listStyles.titleRow}>
            <Text style={listStyles.title} numberOfLines={1}>{title}</Text>
            {badge && (
              <View style={[listStyles.badge, { backgroundColor: badgeColor + '22', borderColor: badgeColor }]}>
                <Text style={[listStyles.badgeText, { color: badgeColor }]}>{badge}</Text>
              </View>
            )}
          </View>
          {subtitle && <Text style={listStyles.subtitle} numberOfLines={1}>{subtitle}</Text>}
          {meta && <Text style={listStyles.meta}>{meta}</Text>}
        </View>

        {/* Right */}
        {(rightValue || showChevron) && (
          <View style={listStyles.right}>
            {rightValue && <Text style={[listStyles.rightValue, { color: rightValueColor }]}>{rightValue}</Text>}
            {showChevron && <Ionicons name="chevron-forward" size={15} color="#5A5A7A" style={{ marginLeft: 4 }} />}
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const listStyles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 13,
    paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1E1E3A',
    backgroundColor: '#1A1A2E',
  },
  leftSlot: { marginRight: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  content: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 14, fontWeight: '700', color: '#E8E8FF', flex: 1 },
  subtitle: { fontSize: 12, color: '#8888AA', marginTop: 2 },
  meta: { fontSize: 11, color: '#5A5A7A', marginTop: 3 },
  badge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  right: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  rightValue: { fontSize: 13, fontWeight: '700' },
});


// ─────────────────────────────────────────
// AppEmptyState
// ─────────────────────────────────────────
interface AppEmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title?: string;
  message?: string;
  action?: { label: string; onPress: () => void };
  style?: ViewStyle;
}

export const AppEmptyState: React.FC<AppEmptyStateProps> = ({
  icon = 'cube-outline', title = 'Nothing here yet',
  message = 'Add something to get started.', action, style,
}) => (
  <View style={[emptyStyles.container, style]}>
    <View style={emptyStyles.iconWrapper}>
      <Ionicons name={icon} size={48} color="#3A3A5C" />
    </View>
    <Text style={emptyStyles.title}>{title}</Text>
    <Text style={emptyStyles.message}>{message}</Text>
    {action && (
      <TouchableOpacity style={emptyStyles.btn} onPress={action.onPress}>
        <Text style={emptyStyles.btnText}>{action.label}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const emptyStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  iconWrapper: { width: 88, height: 88, borderRadius: 28, backgroundColor: '#1E1E3A', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#2E2E4A' },
  title: { fontSize: 17, fontWeight: '800', color: '#C8C8E8', textAlign: 'center' },
  message: { fontSize: 13, color: '#6B6B8A', textAlign: 'center', marginTop: 6, lineHeight: 20, maxWidth: 260 },
  btn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: '#6C63FF22', borderWidth: 1.5, borderColor: '#6C63FF' },
  btnText: { color: '#6C63FF', fontWeight: '700', fontSize: 14 },
});


// ─────────────────────────────────────────
// AppLoader
// ─────────────────────────────────────────
interface AppLoaderProps {
  fullScreen?: boolean;
  message?: string;
  size?: 'small' | 'large';
  style?: ViewStyle;
}

export const AppLoader: React.FC<AppLoaderProps> = ({
  fullScreen, message = 'Loading…', size = 'large', style,
}) => {
  if (fullScreen) {
    return (
      <View style={loaderStyles.fullScreen}>
        <View style={loaderStyles.card}>
          <ActivityIndicator size={size} color="#6C63FF" />
          <Text style={loaderStyles.text}>{message}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={[loaderStyles.inline, style]}>
      <ActivityIndicator size={size} color="#6C63FF" />
      {message && <Text style={loaderStyles.inlineText}>{message}</Text>}
    </View>
  );
};

const loaderStyles = StyleSheet.create({
  fullScreen: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(10,10,20,0.85)', zIndex: 999 },
  card: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#2E2E4A' },
  text: { marginTop: 14, color: '#A0A0C0', fontSize: 14, fontWeight: '600' },
  inline: { padding: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  inlineText: { color: '#6B6B8A', fontSize: 13 },
});
