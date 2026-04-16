import Ionicons from '@expo/vector-icons/Ionicons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import React, { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

// Switched to Ionicons to match the rest of the CRM app!
type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof Ionicons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Ionicons mappings here.
 * - see Ionicons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'paper-plane',
  'person.2.fill': 'people',
  'person.3.fill': 'people',
  'person.fill': 'person',
  'chevron.left.forwardslash.chevron.right': 'code-slash',
  'chevron.right': 'chevron-forward',
  'shippingbox.fill': 'cube',
  'doc.text.fill': 'document-text',
  'creditcard.fill': 'card',
  'ellipsis.message.fill': 'chatbubble-ellipses',
  'chart.bar.fill': 'bar-chart',
  'exclamationmark.triangle.fill': 'alert-circle',
  'building.2.fill': 'business',
  'cart.fill': 'cart',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Ionicons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Ionicons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <Ionicons color={color} size={size} name={MAPPING[name]} style={style} />;
}