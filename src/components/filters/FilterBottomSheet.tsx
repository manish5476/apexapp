import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode, useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/src/components/themed-text';
import { Spacing, ThemeColors, Typography, UI, getElevation } from '@/src/constants/theme';

type FilterBottomSheetProps = {
  visible: boolean;
  title?: string;
  theme: ThemeColors;
  children: ReactNode;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  applyLabel?: string;
  resetLabel?: string;
};

const SCREEN_HEIGHT = Dimensions.get('window').height;

export function FilterBottomSheet({
  visible,
  title = 'Filters',
  theme,
  children,
  onClose,
  onApply,
  onReset,
  applyLabel = 'Apply',
  resetLabel = 'Reset',
}: FilterBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : SCREEN_HEIGHT,
      damping: 24,
      stiffness: 220,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
  }, [visible, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 90 || gesture.vy > 0.8) {
          onClose();
          return;
        }
        Animated.spring(translateY, {
          toValue: 0,
          damping: 24,
          stiffness: 220,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.bgPrimary,
              paddingBottom: Math.max(insets.bottom, Spacing.md),
              transform: [{ translateY }],
              borderColor: theme.borderPrimary,
              ...getElevation(3, theme),
            },
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.dragRegion}>
            <View style={[styles.handle, { backgroundColor: theme.borderSecondary }]} />
          </View>

          <View style={[styles.header, { borderBottomColor: theme.borderPrimary }]}>
            <ThemedText style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fonts.heading }]}>
              {title}
            </ThemedText>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary }]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close filters"
            >
              <Ionicons name="close" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: theme.borderPrimary }]}>
            <TouchableOpacity
              style={[styles.resetBtn, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary }]}
              onPress={onReset}
            >
              <ThemedText style={[styles.resetText, { color: theme.textPrimary, fontFamily: theme.fonts.heading }]}>
                {resetLabel}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: theme.accentPrimary }]}
              onPress={onApply}
            >
              <ThemedText style={[styles.applyText, { color: theme.bgPrimary, fontFamily: theme.fonts.heading }]}>
                {applyLabel}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.46)',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: UI.borderRadius.xl,
    borderTopRightRadius: UI.borderRadius.xl,
    borderWidth: UI.borderWidth.thin,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  dragRegion: {
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 999,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: UI.borderWidth.thin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: UI.borderRadius.pill,
    borderWidth: UI.borderWidth.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    maxHeight: SCREEN_HEIGHT * 0.62,
  },
  bodyContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing['2xl'],
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: UI.borderWidth.thin,
  },
  resetBtn: {
    flex: 1,
    height: 48,
    borderRadius: UI.borderRadius.md,
    borderWidth: UI.borderWidth.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: UI.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
  },
  applyText: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
  },
});
