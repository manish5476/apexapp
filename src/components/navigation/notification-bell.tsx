import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/src/components/themed-text';
import { ThemeColors, Typography, UI } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { useNotifications } from '@/src/hooks/use-notifications';

export function NotificationBell() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { unreadCount } = useNotifications();
  const badgeText = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      style={styles.button}
      onPress={() => router.push('/(tabs)/notifications/index' as any)}
    >
      <Ionicons name="notifications-outline" size={20} color={theme.textPrimary} />
      {unreadCount > 0 ? (
        <View style={styles.badge}>
          <ThemedText style={styles.badgeText}>{badgeText}</ThemedText>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    button: {
      width: 38,
      height: 38,
      borderRadius: UI.borderRadius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.bgSecondary,
      borderWidth: 1,
      borderColor: theme.borderPrimary,
      position: 'relative',
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -6,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      backgroundColor: theme.error,
      borderWidth: 1,
      borderColor: theme.bgPrimary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      color: theme.bgPrimary,
      fontSize: Typography.size.xs,
      fontWeight: Typography.weight.bold,
      lineHeight: 14,
    },
  });
