/**
 * AppButton.tsx
 * Reusable animated button with variants, sizes, loading, icon support.
 * Usage:
 *   <AppButton label="Save" onPress={...} />
 *   <AppButton label="Delete" variant="danger" icon="trash-outline" />
 *   <AppButton label="Loading" loading />
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from 'react-native';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'warning';
type Size = 'sm' | 'md' | 'lg';

interface AppButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
}

const VARIANTS: Record<Variant, { bg: string; text: string; border: string }> = {
  primary:   { bg: '#6C63FF', text: '#FFFFFF', border: '#6C63FF' },
  secondary: { bg: '#1E1E2E', text: '#A0A0C0', border: '#3A3A5C' },
  danger:    { bg: '#FF4C6A', text: '#FFFFFF', border: '#FF4C6A' },
  ghost:     { bg: 'transparent', text: '#6C63FF', border: '#6C63FF' },
  success:   { bg: '#00C896', text: '#FFFFFF', border: '#00C896' },
  warning:   { bg: '#FFB547', text: '#1A1A2E', border: '#FFB547' },
};

const SIZES: Record<Size, { height: number; fontSize: number; paddingH: number; iconSize: number }> = {
  sm: { height: 36, fontSize: 13, paddingH: 14, iconSize: 14 },
  md: { height: 48, fontSize: 15, paddingH: 20, iconSize: 18 },
  lg: { height: 56, fontSize: 17, paddingH: 28, iconSize: 22 },
};

export const AppButton: React.FC<AppButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const colors = VARIANTS[variant];
  const dims = SIZES[size];
  const isDisabled = disabled || loading;

  const onPressIn = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 30 }),
      Animated.timing(opacity, { toValue: 0.85, duration: 80, useNativeDriver: true }),
    ]).start();
  };

  const onPressOut = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }),
      Animated.timing(opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
  };

  const isGhost = variant === 'ghost';

  return (
    <TouchableWithoutFeedback
      onPress={isDisabled ? undefined : onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View
        style={[
          styles.base,
          {
            height: dims.height,
            paddingHorizontal: dims.paddingH,
            backgroundColor: isGhost ? 'transparent' : colors.bg,
            borderColor: colors.border,
            borderWidth: isGhost ? 1.5 : 0,
            transform: [{ scale }],
            opacity: isDisabled ? 0.5 : opacity,
            alignSelf: fullWidth ? 'stretch' : 'flex-start',
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.text} size="small" />
        ) : (
          <View style={styles.inner}>
            {icon && iconPosition === 'left' && (
              <Ionicons
                name={icon}
                size={dims.iconSize}
                color={isGhost ? colors.border : colors.text}
                style={{ marginRight: 7 }}
              />
            )}
            <Text style={[styles.label, { fontSize: dims.fontSize, color: isGhost ? colors.border : colors.text }]}>
              {label}
            </Text>
            {icon && iconPosition === 'right' && (
              <Ionicons
                name={icon}
                size={dims.iconSize}
                color={isGhost ? colors.border : colors.text}
                style={{ marginLeft: 7 }}
              />
            )}
          </View>
        )}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default AppButton;
