import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '../hooks/use-theme-color';
import React from 'react';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  variant?: 'primary' | 'secondary' | 'ternary';
};

export function ThemedView({ 
  style, 
  lightColor, 
  darkColor, 
  variant = 'primary',
  ...otherProps 
}: ThemedViewProps) {
  const tokenMap = {
    primary: 'bgPrimary',
    secondary: 'bgSecondary',
    ternary: 'bgTernary',
  } as const;

  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor }, 
    tokenMap[variant]
  );

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
