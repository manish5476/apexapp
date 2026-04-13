import React from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';
import { Colors } from '../constants/theme';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.prototype.name;
  color?: string;
}

export function StatCard({ label, value, icon, color = '#E8622A' }: StatCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.card, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.content}>
        <ThemedText style={styles.label}>{label}</ThemedText>
        <ThemedText style={[styles.value, { color: isDark ? '#FFFFFF' : '#0A0A0A' }]}>
          {typeof value === 'number' ? `₹${value.toLocaleString()}` : value}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    minHeight: 80
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    color: '#737066',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  }
});
