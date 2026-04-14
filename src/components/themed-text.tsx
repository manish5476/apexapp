import React from 'react';
import { Text, type TextProps } from 'react-native';
import { Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/use-app-theme';

// --- IMPORT YOUR TOKENS HERE ---

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'subtitle' | 'defaultSemiBold' | 'link' | 'label';
  colorVariant?: 'primary' | 'secondary' | 'tertiary' | 'label' | 'error' | 'success';
};

export function ThemedText({
  style,
  type = 'default',
  colorVariant = 'primary',
  ...rest
}: ThemedTextProps) {
  const theme = useAppTheme();

  // 1. Resolve Semantic Color
  const colorMap = {
    primary: theme.textPrimary,
    secondary: theme.textSecondary,
    tertiary: theme.textTertiary,
    label: theme.textLabel,
    error: theme.error,
    success: theme.success,
  };

  // Links strictly use the active theme's accent color
  const textColor = type === 'link' ? theme.accentPrimary : colorMap[colorVariant];

  // 2. Resolve Typography Styles dynamically
  let typographyStyle: any = {};

  switch (type) {
    case 'title':
      typographyStyle = {
        fontFamily: theme.fonts.heading,
        fontSize: Typography.size['4xl'],
        fontWeight: Typography.weight.bold,
        letterSpacing: -0.5,
      };
      break;
    case 'subtitle':
      typographyStyle = {
        fontFamily: theme.fonts.heading,
        fontSize: Typography.size.xl,
        fontWeight: Typography.weight.bold,
      };
      break;
    case 'defaultSemiBold':
      typographyStyle = {
        fontFamily: theme.fonts.body,
        fontSize: Typography.size.base,
        fontWeight: Typography.weight.semibold,
      };
      break;
    case 'link':
      typographyStyle = {
        fontFamily: theme.fonts.body,
        fontSize: Typography.size.base,
        fontWeight: Typography.weight.semibold,
      };
      break;
    case 'label':
      // Perfect for forms and tiny badges
      typographyStyle = {
        fontFamily: theme.fonts.body,
        fontSize: Typography.size.xs,
        fontWeight: Typography.weight.bold,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
      };
      break;
    case 'default':
    default:
      typographyStyle = {
        fontFamily: theme.fonts.body,
        fontSize: Typography.size.base,
        lineHeight: Typography.size.base * 1.5,
      };
      break;
  }

  return (
    <Text
      style={[
        { color: textColor },
        typographyStyle,
        style,
      ]}
      {...rest}
    />
  );
}