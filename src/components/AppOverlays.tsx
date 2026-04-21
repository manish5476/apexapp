/**
 * AppModal.tsx — Full modal with header, scrollable body, footer buttons
 * AppBottomSheet.tsx — Slide-up sheet with snap points
 * AppAlert.tsx — In-app alert/toast banner
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

// ─────────────────────────────────────────
// AppModal
// ─────────────────────────────────────────
interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  primaryAction?: { label: string; onPress: () => void; loading?: boolean };
  secondaryAction?: { label: string; onPress: () => void };
  size?: 'sm' | 'md' | 'lg' | 'full';
}

export const AppModal: React.FC<AppModalProps> = ({
  visible, onClose, title, subtitle, children,
  primaryAction, secondaryAction, size = 'md',
}) => {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 100, friction: 10 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scale, { toValue: 0.9, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const maxH = { sm: SCREEN_H * 0.35, md: SCREEN_H * 0.55, lg: SCREEN_H * 0.8, full: SCREEN_H }[size];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[modalStyles.backdrop, { opacity }]} />
      </TouchableWithoutFeedback>
      <View style={modalStyles.centered}>
        <Animated.View style={[modalStyles.sheet, { maxHeight: maxH, transform: [{ scale }], opacity }]}>
          <View style={modalStyles.header}>
            <View style={modalStyles.flex1}>
              <Text style={modalStyles.title}>{title}</Text>
              {subtitle && <Text style={modalStyles.subtitle}>{subtitle}</Text>}
            </View>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color="#A0A0C0" />
            </TouchableOpacity>
          </View>
          <View style={modalStyles.divider} />
          <ScrollView style={{ maxHeight: maxH - 160 }} contentContainerStyle={modalStyles.body}>
            {children}
          </ScrollView>
          {(primaryAction || secondaryAction) && (
            <>
              <View style={modalStyles.divider} />
              <View style={modalStyles.footer}>
                {secondaryAction && (
                  <TouchableOpacity style={modalStyles.secondaryBtn} onPress={secondaryAction.onPress}>
                    <Text style={modalStyles.secondaryBtnText}>{secondaryAction.label}</Text>
                  </TouchableOpacity>
                )}
                {primaryAction && (
                  <TouchableOpacity style={modalStyles.primaryBtn} onPress={primaryAction.onPress}>
                    <Text style={modalStyles.primaryBtnText}>{primaryAction.label}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  sheet: { width: '100%', backgroundColor: '#1A1A2E', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#2E2E4A' },
  header: { flexDirection: 'row', alignItems: 'flex-start', padding: 20 },
  flex1: { flex: 1 },
  title: { fontSize: 18, fontWeight: '800', color: '#E8E8FF', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: '#6B6B8A', marginTop: 3 },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#2E2E4A', justifyContent: 'center', alignItems: 'center' },
  divider: { height: 1, backgroundColor: '#2E2E4A' },
  body: { padding: 20 },
  footer: { flexDirection: 'row', gap: 10, padding: 16 },
  secondaryBtn: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#3A3A5C', justifyContent: 'center', alignItems: 'center' },
  secondaryBtnText: { color: '#A0A0C0', fontWeight: '600', fontSize: 14 },
  primaryBtn: { flex: 1, height: 44, borderRadius: 10, backgroundColor: '#6C63FF', justifyContent: 'center', alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});


// ─────────────────────────────────────────
// AppBottomSheet
// ─────────────────────────────────────────
interface AppBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  height?: number;
  children?: React.ReactNode;
}

export const AppBottomSheet: React.FC<AppBottomSheetProps> = ({
  visible, onClose, title, height = SCREEN_H * 0.5, children,
}) => {
  const translateY = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : height,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [visible, height]);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
    onPanResponderMove: (_, g) => {
      if (g.dy > 0) translateY.setValue(g.dy);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dy > height * 0.3 || g.vy > 0.8) {
        onClose();
      } else {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
      }
    },
  });

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={sheetStyles.backdrop} />
      </TouchableWithoutFeedback>
      <Animated.View style={[sheetStyles.sheet, { height, transform: [{ translateY }] }]}>
        <View {...panResponder.panHandlers}>
          <View style={sheetStyles.handle} />
          {title && (
            <View style={sheetStyles.header}>
              <Text style={sheetStyles.title}>{title}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={20} color="#A0A0C0" />
              </TouchableOpacity>
            </View>
          )}
        </View>
        <ScrollView contentContainerStyle={sheetStyles.body}>
          {children}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
};

const sheetStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#1A1A2E', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderColor: '#2E2E4A',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#3A3A5C', alignSelf: 'center', marginTop: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontSize: 17, fontWeight: '800', color: '#E8E8FF' },
  body: { paddingHorizontal: 20, paddingBottom: 40 },
});


// ─────────────────────────────────────────
// AppAlert  (inline toast-style banner)
// ─────────────────────────────────────────
type AlertType = 'success' | 'error' | 'warning' | 'info';

const ALERT_CONFIG: Record<AlertType, { bg: string; border: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  success: { bg: '#00C89611', border: '#00C896', icon: 'checkmark-circle-outline', color: '#00C896' },
  error:   { bg: '#FF4C6A11', border: '#FF4C6A', icon: 'alert-circle-outline', color: '#FF4C6A' },
  warning: { bg: '#FFB54711', border: '#FFB547', icon: 'warning-outline', color: '#FFB547' },
  info:    { bg: '#6C63FF11', border: '#6C63FF', icon: 'information-circle-outline', color: '#6C63FF' },
};

interface AppAlertProps {
  type?: AlertType;
  title: string;
  message?: string;
  onClose?: () => void;
  style?: ViewStyle;
}

export const AppAlert: React.FC<AppAlertProps> = ({ type = 'info', title, message, onClose, style }) => {
  const cfg = ALERT_CONFIG[type];
  return (
    <View style={[alertStyles.container, { backgroundColor: cfg.bg, borderLeftColor: cfg.border }, style]}>
      <Ionicons name={cfg.icon} size={20} color={cfg.color} style={{ marginTop: 1 }} />
      <View style={alertStyles.text}>
        <Text style={[alertStyles.title, { color: cfg.color }]}>{title}</Text>
        {message && <Text style={alertStyles.msg}>{message}</Text>}
      </View>
      {onClose && (
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={16} color={cfg.color} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const alertStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, padding: 14, borderLeftWidth: 3, marginBottom: 12 },
  text: { flex: 1 },
  title: { fontSize: 13, fontWeight: '700' },
  msg: { fontSize: 12, color: '#A0A0C0', marginTop: 3, lineHeight: 16 },
});
