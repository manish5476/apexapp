/**
 * AppHeader.tsx    — Screen header with back, title, subtitle, actions
 * AppTabBar.tsx    — Custom animated bottom tab bar
 * AppStepper.tsx   — Multi-step progress indicator
 * AppProgressBar.tsx — Animated progress bar with label
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

// ─────────────────────────────────────────
// AppHeader
// ─────────────────────────────────────────
interface HeaderAction {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: number;
  color?: string;
}

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  onBack?: () => void;
  actions?: HeaderAction[];
  transparent?: boolean;
  style?: ViewStyle;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title, subtitle, back = false, onBack,
  actions = [], transparent, style,
}) => (
  <View style={[headerStyles.container, transparent && headerStyles.transparent, style]}>
    <View style={headerStyles.left}>
      {back && (
        <TouchableOpacity style={headerStyles.backBtn} onPress={onBack ?? (() => router.back())} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={20} color="#E8E8FF" />
        </TouchableOpacity>
      )}
      <View>
        {subtitle && <Text style={headerStyles.subtitle}>{subtitle}</Text>}
        <Text style={headerStyles.title} numberOfLines={1}>{title}</Text>
      </View>
    </View>
    <View style={headerStyles.actions}>
      {actions.map((a, i) => (
        <TouchableOpacity key={i} style={headerStyles.actionBtn} onPress={a.onPress}>
          <Ionicons name={a.icon} size={20} color={a.color ?? '#A0A0C0'} />
          {(a.badge ?? 0) > 0 && (
            <View style={headerStyles.badge}>
              <Text style={headerStyles.badgeText}>{a.badge! > 99 ? '99+' : a.badge}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 12 : (StatusBar.currentHeight ?? 0) + 12,
    paddingBottom: 12, backgroundColor: '#12122A',
    borderBottomWidth: 1, borderBottomColor: '#1E1E3A',
  },
  transparent: { backgroundColor: 'transparent', borderBottomWidth: 0 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1E1E3A', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#E8E8FF', letterSpacing: -0.3 },
  subtitle: { fontSize: 11, color: '#6B6B8A', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1E1E3A', justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: -3, right: -3, backgroundColor: '#FF4C6A', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#12122A' },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
});


// ─────────────────────────────────────────
// AppTabBar  (custom bottom tab bar)
// ─────────────────────────────────────────
interface TabItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon?: keyof typeof Ionicons.glyphMap;
  badge?: number;
}

interface AppTabBarProps {
  tabs: TabItem[];
  activeKey: string;
  onPress: (key: string) => void;
}

export const AppTabBar: React.FC<AppTabBarProps> = ({ tabs, activeKey, onPress }) => {
  const tabScales = useRef<Record<string, Animated.Value>>({});

  return (
    <View style={tabStyles.container}>
      {tabs.map(tab => {
        const isActive = tab.key === activeKey;
        if (!tabScales.current[tab.key]) {
          tabScales.current[tab.key] = new Animated.Value(1);
        }
        const scale = tabScales.current[tab.key];

        const handlePress = () => {
          Animated.sequence([
            Animated.spring(scale, { toValue: 0.85, useNativeDriver: true, speed: 30 }),
            Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }),
          ]).start();
          onPress(tab.key);
        };

        return (
          <TouchableOpacity key={tab.key} style={tabStyles.tab} onPress={handlePress} activeOpacity={1}>
            <Animated.View style={[tabStyles.tabInner, isActive && tabStyles.tabActive, { transform: [{ scale }] }]}>
              <View style={{ position: 'relative' }}>
                <Ionicons
                  name={isActive ? (tab.activeIcon ?? tab.icon) : tab.icon}
                  size={22}
                  color={isActive ? '#6C63FF' : '#5A5A7A'}
                />
                {(tab.badge ?? 0) > 0 && (
                  <View style={tabStyles.badge}>
                    <Text style={tabStyles.badgeText}>{tab.badge! > 9 ? '9+' : tab.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[tabStyles.label, isActive && tabStyles.labelActive]}>{tab.label}</Text>
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row', backgroundColor: '#1A1A2E',
    borderTopWidth: 1, borderTopColor: '#2E2E4A',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8, paddingHorizontal: 8,
  },
  tab: { flex: 1, alignItems: 'center' },
  tabInner: { alignItems: 'center', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 14 },
  tabActive: { backgroundColor: '#6C63FF18' },
  label: { fontSize: 10, fontWeight: '600', color: '#5A5A7A', marginTop: 3 },
  labelActive: { color: '#6C63FF' },
  badge: { position: 'absolute', top: -4, right: -6, backgroundColor: '#FF4C6A', borderRadius: 7, minWidth: 14, height: 14, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2, borderWidth: 1.5, borderColor: '#1A1A2E' },
  badgeText: { fontSize: 8, fontWeight: '800', color: '#fff' },
});


// ─────────────────────────────────────────
// AppStepper
// ─────────────────────────────────────────
interface StepItem { label: string; optional?: boolean }

interface AppStepperProps {
  steps: StepItem[];
  currentStep: number;   // 0-based
  style?: ViewStyle;
}

export const AppStepper: React.FC<AppStepperProps> = ({ steps, currentStep, style }) => (
  <View style={[stepperStyles.container, style]}>
    {steps.map((step, i) => {
      const done = i < currentStep;
      const active = i === currentStep;
      return (
        <View key={i} style={stepperStyles.stepRow}>
          <View style={stepperStyles.stepLeft}>
            <View style={[
              stepperStyles.circle,
              done && stepperStyles.circleDone,
              active && stepperStyles.circleActive,
            ]}>
              {done
                ? <Ionicons name="checkmark" size={12} color="#fff" />
                : <Text style={[stepperStyles.num, active && { color: '#fff' }]}>{i + 1}</Text>
              }
            </View>
            {i < steps.length - 1 && (
              <View style={[stepperStyles.line, (done || active) && stepperStyles.lineDone]} />
            )}
          </View>
          <View style={stepperStyles.stepText}>
            <Text style={[stepperStyles.stepLabel, active && stepperStyles.stepLabelActive, done && stepperStyles.stepLabelDone]}>
              {step.label}
            </Text>
            {step.optional && <Text style={stepperStyles.optional}>Optional</Text>}
          </View>
        </View>
      );
    })}
  </View>
);

const stepperStyles = StyleSheet.create({
  container: { paddingVertical: 8 },
  stepRow: { flexDirection: 'row', gap: 14, marginBottom: 0 },
  stepLeft: { alignItems: 'center', width: 28 },
  circle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1E1E3A', borderWidth: 1.5, borderColor: '#3A3A5C', justifyContent: 'center', alignItems: 'center' },
  circleDone: { backgroundColor: '#00C896', borderColor: '#00C896' },
  circleActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  num: { fontSize: 12, fontWeight: '700', color: '#6B6B8A' },
  line: { width: 2, flex: 1, minHeight: 20, backgroundColor: '#2E2E4A', marginVertical: 3 },
  lineDone: { backgroundColor: '#6C63FF' },
  stepText: { paddingBottom: 20, flex: 1 },
  stepLabel: { fontSize: 13, fontWeight: '600', color: '#6B6B8A', marginTop: 4 },
  stepLabelActive: { color: '#E8E8FF', fontWeight: '800' },
  stepLabelDone: { color: '#00C896' },
  optional: { fontSize: 11, color: '#5A5A7A', marginTop: 2 },
});


// ─────────────────────────────────────────
// AppProgressBar
// ─────────────────────────────────────────
interface AppProgressBarProps {
  value: number;         // 0–100
  label?: string;
  showValue?: boolean;
  color?: string;
  height?: number;
  animated?: boolean;
  style?: ViewStyle;
}

export const AppProgressBar: React.FC<AppProgressBarProps> = ({
  value, label, showValue = true, color = '#6C63FF', height = 8, animated = true, style,
}) => {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: Math.min(100, Math.max(0, value)),
      duration: animated ? 600 : 0,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const widthPct = width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View style={[{ marginBottom: 8 }, style]}>
      {(label || showValue) && (
        <View style={progressStyles.labelRow}>
          {label && <Text style={progressStyles.label}>{label}</Text>}
          {showValue && <Text style={[progressStyles.value, { color }]}>{Math.round(value)}%</Text>}
        </View>
      )}
      <View style={[progressStyles.track, { height }]}>
        <Animated.View style={[progressStyles.fill, { width: widthPct, backgroundColor: color, height }]} />
      </View>
    </View>
  );
};

const progressStyles = StyleSheet.create({
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  label: { fontSize: 12, fontWeight: '600', color: '#A0A0C0' },
  value: { fontSize: 12, fontWeight: '700' },
  track: { backgroundColor: '#2E2E4A', borderRadius: 99, overflow: 'hidden' },
  fill: { borderRadius: 99 },
});
