import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '../hooks/use-theme-color';
import React from 'react';
import { Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/use-app-theme';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'textPrimary');
  const theme = useAppTheme();

  const fontFamily = type === 'title' || type === 'subtitle' 
    ? theme.fonts.heading 
    : theme.fonts.body;

  return (
    <Text
      style={[
        { color, fontFamily },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: Typography.size.base,
    lineHeight: Typography.size.base * 1.5,
  },
  defaultSemiBold: {
    fontSize: Typography.size.base,
    lineHeight: Typography.size.base * 1.5,
    fontWeight: Typography.weight.semibold,
  },
  title: {
    fontSize: Typography.size['4xl'],
    fontWeight: Typography.weight.bold,
    lineHeight: Typography.size['4xl'],
  },
  subtitle: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
  },
  link: {
    lineHeight: 30,
    fontSize: Typography.size.base,
    color: '#0a7ea4',
  },
});
