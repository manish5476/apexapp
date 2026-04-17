import React from 'react';
import { View } from 'react-native';

// 1. Import your custom theme hook instead of the React Navigation one
import { useAppTheme } from '@/src/hooks/use-app-theme';

// 2. Import your theme constants
import { Spacing, UI } from '@/src/constants/theme';

// 3. Import your custom Text component (matching your ProductDetailsScreen)
import { ThemedText } from '@/src/components/themed-text';

interface BadgeProps {
  label: string;
  status: 'completed' | 'pending' | 'failed' | 'cancelled' | string;
}

export const Badge = ({ label, status }: BadgeProps) => {
  // 4. Call your custom hook which contains the 'success', 'warning', 'error' tokens
  const theme = useAppTheme();

  const getColors = () => {
    switch (status.toLowerCase()) {
      case 'completed': return { bg: `${theme.success}15`, text: theme.success }; // 15 is hex for ~8% opacity
      case 'pending': return { bg: `${theme.warning}15`, text: theme.warning };
      case 'failed':
      case 'cancelled': return { bg: `${theme.error}15`, text: theme.error };
      default: return { bg: `${theme.info}15`, text: theme.info };
    }
  };

  const colors = getColors();

  return (
    <View style={{
      backgroundColor: colors.bg,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: UI.borderRadius.pill,
      alignSelf: 'flex-start'
    }}>
      <ThemedText style={{
        color: colors.text,
        textTransform: 'uppercase',
        fontSize: 11, // Maps to your Typography.size.xs
        fontWeight: 'bold'
      }}>
        {label}
      </ThemedText>
    </View>
  );
};