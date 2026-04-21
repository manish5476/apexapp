/**
 * AppTable.tsx    — Responsive data table with sort, row press
 * AppStats.tsx    — Horizontal stat cards row (KPI strip)
 * AppTimeline.tsx — Vertical event timeline
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

// ─────────────────────────────────────────
// AppTable
// ─────────────────────────────────────────
export interface TableColumn<T> {
  key: keyof T;
  header: string;
  width?: number;
  flex?: number;
  align?: 'left' | 'center' | 'right';
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  sortable?: boolean;
}

interface AppTableProps<T extends object> {
  columns: TableColumn<T>[];
  data: T[];
  onRowPress?: (row: T, index: number) => void;
  keyExtractor: (row: T, index: number) => string;
  emptyMessage?: string;
  style?: ViewStyle;
}

type SortDir = 'asc' | 'desc' | null;

export function AppTable<T extends object>({
  columns, data, onRowPress, keyExtractor, emptyMessage = 'No data available', style,
}: AppTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const handleSort = (col: TableColumn<T>) => {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir(d => d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc');
      if (sortDir === 'desc') setSortKey(null);
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
  };

  const sorted = [...data].sort((a, b) => {
    if (!sortKey || !sortDir) return 0;
    const va = a[sortKey]; const vb = b[sortKey];
    const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <View style={[tableStyles.container, style]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Header */}
          <View style={tableStyles.headerRow}>
            {columns.map(col => (
              <TouchableOpacity
                key={String(col.key)}
                style={[tableStyles.cell, { width: col.width, flex: col.flex ?? 1 }, col.align && { alignItems: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start' }]}
                onPress={() => handleSort(col)}
                disabled={!col.sortable}
              >
                <Text style={tableStyles.headerText}>{col.header}</Text>
                {col.sortable && (
                  <Ionicons
                    name={sortKey === col.key && sortDir === 'asc' ? 'arrow-up' : sortKey === col.key && sortDir === 'desc' ? 'arrow-down' : 'swap-vertical'}
                    size={12}
                    color={sortKey === col.key ? '#6C63FF' : '#4A4A6A'}
                    style={{ marginLeft: 3 }}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Rows */}
          {sorted.length === 0 ? (
            <View style={tableStyles.emptyRow}>
              <Text style={tableStyles.emptyText}>{emptyMessage}</Text>
            </View>
          ) : sorted.map((row, i) => (
            <TouchableOpacity
              key={keyExtractor(row, i)}
              style={[tableStyles.dataRow, i % 2 === 1 && tableStyles.altRow]}
              onPress={() => onRowPress?.(row, i)}
              disabled={!onRowPress}
              activeOpacity={0.75}
            >
              {columns.map(col => (
                <View key={String(col.key)} style={[tableStyles.cell, { width: col.width, flex: col.flex ?? 1 }, col.align && { alignItems: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start' }]}>
                  {col.render
                    ? col.render(row[col.key], row)
                    : <Text style={tableStyles.cellText} numberOfLines={1}>{String(row[col.key] ?? '—')}</Text>
                  }
                </View>
              ))}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const tableStyles = StyleSheet.create({
  container: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#2E2E4A' },
  headerRow: { flexDirection: 'row', backgroundColor: '#12122A', paddingVertical: 10, paddingHorizontal: 4 },
  dataRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 4, backgroundColor: '#1A1A2E' },
  altRow: { backgroundColor: '#161628' },
  cell: { paddingHorizontal: 12, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', minWidth: 80 },
  headerText: { fontSize: 11, fontWeight: '700', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: 0.5 },
  cellText: { fontSize: 13, color: '#C8C8E8', fontWeight: '500' },
  emptyRow: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#5A5A7A', fontSize: 13 },
});


// ─────────────────────────────────────────
// AppStats  (KPI Strip)
// ─────────────────────────────────────────
interface StatItem {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  trend?: number;
}

interface AppStatsProps {
  stats: StatItem[];
  style?: ViewStyle;
}

export const AppStats: React.FC<AppStatsProps> = ({ stats, style }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={style} contentContainerStyle={statsStyles.row}>
    {stats.map((stat, i) => (
      <View key={i} style={statsStyles.card}>
        <View style={statsStyles.top}>
          {stat.icon && (
            <View style={[statsStyles.iconBox, { backgroundColor: (stat.color ?? '#6C63FF') + '22' }]}>
              <Ionicons name={stat.icon} size={16} color={stat.color ?? '#6C63FF'} />
            </View>
          )}
          {stat.trend !== undefined && (
            <View style={[statsStyles.trend, { backgroundColor: stat.trend >= 0 ? '#00C89618' : '#FF4C6A18' }]}>
              <Ionicons name={stat.trend >= 0 ? 'trending-up' : 'trending-down'} size={11} color={stat.trend >= 0 ? '#00C896' : '#FF4C6A'} />
              <Text style={[statsStyles.trendText, { color: stat.trend >= 0 ? '#00C896' : '#FF4C6A' }]}>{Math.abs(stat.trend)}%</Text>
            </View>
          )}
        </View>
        <Text style={[statsStyles.value, { color: stat.color ?? '#E8E8FF' }]}>{stat.value}</Text>
        <Text style={statsStyles.label}>{stat.label}</Text>
      </View>
    ))}
  </ScrollView>
);

const statsStyles = StyleSheet.create({
  row: { paddingVertical: 4, paddingHorizontal: 2, gap: 10 },
  card: { backgroundColor: '#1A1A2E', borderRadius: 14, padding: 14, minWidth: 120, borderWidth: 1, borderColor: '#2E2E4A' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  iconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  trend: { flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  trendText: { fontSize: 10, fontWeight: '700' },
  value: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  label: { fontSize: 11, color: '#6B6B8A', marginTop: 3, fontWeight: '600' },
});


// ─────────────────────────────────────────
// AppTimeline
// ─────────────────────────────────────────
type TimelineStatus = 'done' | 'active' | 'pending' | 'error';

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  time?: string;
  status?: TimelineStatus;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface AppTimelineProps {
  events: TimelineEvent[];
  style?: ViewStyle;
}

const TL_COLORS: Record<TimelineStatus, { dot: string; line: string; icon: string }> = {
  done:    { dot: '#00C896', line: '#00C89644', icon: '#00C896' },
  active:  { dot: '#6C63FF', line: '#6C63FF44', icon: '#6C63FF' },
  pending: { dot: '#3A3A5C', line: '#2E2E4A',   icon: '#6B6B8A' },
  error:   { dot: '#FF4C6A', line: '#FF4C6A44', icon: '#FF4C6A' },
};

export const AppTimeline: React.FC<AppTimelineProps> = ({ events, style }) => (
  <View style={[tlStyles.container, style]}>
    {events.map((ev, i) => {
      const status = ev.status ?? 'pending';
      const c = TL_COLORS[status];
      const isLast = i === events.length - 1;
      return (
        <View key={ev.id} style={tlStyles.row}>
          {/* Left column */}
          <View style={tlStyles.left}>
            <View style={[tlStyles.dot, { backgroundColor: c.dot, borderColor: c.dot + '44' }]}>
              {ev.icon
                ? <Ionicons name={ev.icon} size={12} color={c.icon} />
                : status === 'done' ? <Ionicons name="checkmark" size={11} color="#fff" />
                : status === 'error' ? <Ionicons name="close" size={11} color="#fff" />
                : null
              }
            </View>
            {!isLast && <View style={[tlStyles.line, { backgroundColor: c.line }]} />}
          </View>
          {/* Content */}
          <View style={[tlStyles.content, isLast && { paddingBottom: 0 }]}>
            <View style={tlStyles.titleRow}>
              <Text style={[tlStyles.title, status === 'active' && { color: '#E8E8FF' }]}>{ev.title}</Text>
              {ev.time && <Text style={tlStyles.time}>{ev.time}</Text>}
            </View>
            {ev.description && <Text style={tlStyles.desc}>{ev.description}</Text>}
          </View>
        </View>
      );
    })}
  </View>
);

const tlStyles = StyleSheet.create({
  container: { paddingVertical: 4 },
  row: { flexDirection: 'row', gap: 14 },
  left: { alignItems: 'center', width: 32 },
  dot: { width: 32, height: 32, borderRadius: 16, borderWidth: 3, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  line: { width: 2, flex: 1, minHeight: 16, marginVertical: 2 },
  content: { flex: 1, paddingBottom: 20, paddingTop: 4 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: '#A0A0C0', flex: 1 },
  time: { fontSize: 11, color: '#5A5A7A', marginLeft: 8 },
  desc: { fontSize: 12, color: '#6B6B8A', marginTop: 4, lineHeight: 18 },
});
