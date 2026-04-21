import React from 'react';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  Dashboard: 'grid',
  Product: 'cube',
  Customer: 'people',
  Sales: 'receipt',
  Purchase: 'bag',
  Payment: 'card',
  SalesReturn: 'arrow-undo',
  Emi: 'wallet',
  Ledger: 'book',
};

export function PillTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.wrap}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        const iconName = iconMap[route.name] ?? 'ellipse';
        return (
          <Pressable key={route.key} onPress={onPress} style={[styles.pill, isFocused && styles.pillActive]}>
            <Ionicons name={iconName} size={16} color={isFocused ? '#fff' : '#64748b'} />
            {isFocused ? <Text style={styles.label}>{route.name}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 6,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pill: {
    flex: 1,
    height: 36,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  pillActive: {
    backgroundColor: '#1d4ed8',
  },
  label: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
