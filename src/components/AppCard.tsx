/**
 * AppCard.tsx
 * Versatile card with optional gradient header, badge, press animation.
 * Usage:
 *   <AppCard title="Revenue" subtitle="This month" value="₹1,24,500" trend={+12} />
 *   <AppCard title="Order #1023" onPress={() => ...} badge="New" />
 */

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from 'react-native';

interface AppCardProps {
  title?: string;
  subtitle?: string;
  value?: string;
  trend?: number;          // positive = up, negative = down
  badge?: string;
  badgeColor?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  gradient?: [string, string];
  onPress?: () => void;
  children?: React.ReactNode;
  style?: ViewStyle;
  compact?: boolean;
}

export const AppCard: React.FC<AppCardProps> = ({
  title, subtitle, value, trend, badge, badgeColor = '#6C63FF',
  icon, iconColor = '#6C63FF', gradient, onPress, children, style, compact,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => onPress && Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  return (
    <TouchableWithoutFeedback onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} disabled={!onPress}>
      <Animated.View style={[styles.card, compact && styles.compact, { transform: [{ scale }] }, style]}>
        {gradient ? (
          <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientHeader}>
            {icon && <Ionicons name={icon} size={28} color="#fff" style={{ marginBottom: 8 }} />}
            {value && <Text style={styles.gradValue}>{value}</Text>}
            {title && <Text style={styles.gradTitle}>{title}</Text>}
          </LinearGradient>
        ) : (
          <View style={styles.body}>
            <View style={styles.topRow}>
              {icon && (
                <View style={[styles.iconCircle, { backgroundColor: iconColor + '22' }]}>
                  <Ionicons name={icon} size={20} color={iconColor} />
                </View>
              )}
              <View style={styles.flex1}>
                {title && <Text style={styles.title}>{title}</Text>}
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
              </View>
              {badge && (
                <View style={[styles.badge, { backgroundColor: badgeColor + '22', borderColor: badgeColor }]}>
                  <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
                </View>
              )}
              {onPress && <Ionicons name="chevron-forward" size={16} color="#5A5A7A" />}
            </View>

            {value && (
              <View style={styles.valueRow}>
                <Text style={styles.value}>{value}</Text>
                {trend !== undefined && (
                  <View style={[styles.trend, { backgroundColor: trend >= 0 ? '#00C89622' : '#FF4C6A22' }]}>
                    <Ionicons
                      name={trend >= 0 ? 'trending-up' : 'trending-down'}
                      size={13}
                      color={trend >= 0 ? '#00C896' : '#FF4C6A'}
                    />
                    <Text style={[styles.trendText, { color: trend >= 0 ? '#00C896' : '#FF4C6A' }]}>
                      {Math.abs(trend)}%
                    </Text>
                  </View>
                )}
              </View>
            )}

            {children}
          </View>
        )}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2E2E4A',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  compact: { marginBottom: 8 },
  gradientHeader: { padding: 20 },
  gradValue: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  gradTitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2, fontWeight: '600' },
  body: { padding: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex1: { flex: 1 },
  iconCircle: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: '#C8C8E8', letterSpacing: 0.2 },
  subtitle: { fontSize: 12, color: '#6B6B8A', marginTop: 2 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  valueRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 12, gap: 8 },
  value: { fontSize: 26, fontWeight: '800', color: '#E8E8FF', letterSpacing: -0.5 },
  trend: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, marginBottom: 2 },
  trendText: { fontSize: 12, fontWeight: '700' },
});

export default AppCard;
