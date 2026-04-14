import React from 'react';
import { View, type ViewProps } from 'react-native';
import { getElevation } from '../constants/theme';
import { useAppTheme } from '../hooks/use-app-theme';

// --- IMPORT YOUR TOKENS HERE ---

export type ThemedViewProps = ViewProps & {
  variant?: 'primary' | 'secondary' | 'ternary';
  // Built-in card elevation!
  elevationLevel?: 0 | 1 | 2 | 3;
};

export function ThemedView({
  style,
  variant = 'primary',
  elevationLevel = 0,
  ...otherProps
}: ThemedViewProps) {
  const theme = useAppTheme();

  // Map the variant directly to the active theme's backgrounds
  const bgMap = {
    primary: theme.bgPrimary,
    secondary: theme.bgSecondary,
    ternary: theme.bgTernary,
  };

  const backgroundColor = bgMap[variant];

  // Apply dynamic shadow if elevation is requested
  const elevationStyle = elevationLevel > 0 ? getElevation(elevationLevel as 1 | 2 | 3, theme) : {};

  return (
    <View
      style={[{ backgroundColor }, elevationStyle, style]}
      {...otherProps}
    />
  );
}