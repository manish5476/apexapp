/**
 * AppChart — Reusable chart widget wrapping react-native-gifted-charts.
 * Supports: Line, Bar, Pie, Area with Loading/Empty/Error states.
 */
import { Spacing, Typography } from '@/src/constants/theme';
import { useAppTheme } from '@/src/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';

export type ChartType = 'line' | 'bar' | 'pie' | 'area';

export interface ChartDataPoint {
  value: number;
  label?: string;
  frontColor?: string;
  dataPointColor?: string;
  color?: string;
  text?: string;
}

interface AppChartProps {
  title: string;
  subtitle?: string;
  type: ChartType;
  data: ChartDataPoint[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  height?: number;
  color?: string;
  secondaryColor?: string;
  formatValue?: (v: number) => string;
  noDataMessage?: string;
}

const defaultFormat = (v: number) => {
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `${v}`;
};

export default function AppChart({
  title,
  subtitle,
  type,
  data,
  loading = false,
  error = null,
  onRetry,
  height = 220,
  color,
  formatValue = defaultFormat,
  noDataMessage = 'No data available for this period.',
}: AppChartProps) {
  const theme = useAppTheme();
  const accentColor = color ?? theme.accentPrimary;

  const renderBody = () => {
    if (loading) {
      return (
        <View style={[styles.stateBox, { height }]}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={[styles.stateText, { color: theme.textTertiary }]}>Loading chart…</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={[styles.stateBox, { height }]}>
          <Ionicons name="alert-circle-outline" size={32} color={theme.error} />
          <Text style={[styles.stateText, { color: theme.error }]}>{error}</Text>
          {onRetry && (
            <Pressable
              onPress={onRetry}
              style={[styles.retryBtn, { borderColor: theme.borderPrimary }]}
            >
              <Text style={{ color: theme.accentPrimary, fontWeight: '700', fontSize: 13 }}>
                Retry
              </Text>
            </Pressable>
          )}
        </View>
      );
    }

    if (!data || data.length === 0) {
      return (
        <View style={[styles.stateBox, { height }]}>
          <Ionicons name="bar-chart-outline" size={32} color={theme.textTertiary} />
          <Text style={[styles.stateText, { color: theme.textTertiary }]}>{noDataMessage}</Text>
        </View>
      );
    }

    const chartWidth = 340;

    if (type === 'bar') {
      const colored = data.map((d) => ({
        ...d,
        frontColor: d.frontColor ?? accentColor,
        topLabelComponent: () => (
          <Text style={{ fontSize: 8, color: theme.textTertiary, marginBottom: 2 }}>
            {formatValue(d.value)}
          </Text>
        ),
      }));
      return (
        <BarChart
          data={colored}
          width={chartWidth}
          height={height}
          barWidth={Math.max(12, Math.min(32, Math.floor(chartWidth / data.length) - 8))}
          noOfSections={4}
          roundedTop
          xAxisColor={theme.borderPrimary}
          yAxisColor={theme.borderPrimary}
          yAxisTextStyle={{ color: theme.textTertiary, fontSize: 9 }}
          xAxisLabelTextStyle={{ color: theme.textTertiary, fontSize: 9 }}
          yAxisLabelTexts={undefined}
          formatYLabel={(v) => formatValue(Number(v))}
          hideRules
          disablePress
          isAnimated
          animationDuration={600}
        />
      );
    }

    if (type === 'line' || type === 'area') {
      const colored = data.map((d) => ({
        ...d,
        dataPointColor: d.dataPointColor ?? accentColor,
      }));
      return (
        <LineChart
          data={colored}
          width={chartWidth}
          height={height}
          areaChart={type === 'area'}
          color={accentColor}
          startFillColor={accentColor}
          endFillColor={`${accentColor}00`}
          startOpacity={0.3}
          endOpacity={0}
          noOfSections={4}
          xAxisColor={theme.borderPrimary}
          yAxisColor={theme.borderPrimary}
          yAxisTextStyle={{ color: theme.textTertiary, fontSize: 9 }}
          xAxisLabelTextStyle={{ color: theme.textTertiary, fontSize: 9 }}
          formatYLabel={(v) => formatValue(Number(v))}
          hideRules
          hideDataPoints={data.length > 20}
          isAnimated
          animationDuration={700}
        />
      );
    }

    if (type === 'pie') {
      const PIE_COLORS = [
        accentColor,
        theme.accentSecondary,
        theme.success,
        theme.warning,
        theme.error,
        theme.info,
      ];
      const colored = data.map((d, i) => ({
        ...d,
        color: d.color ?? PIE_COLORS[i % PIE_COLORS.length],
        text: d.text ?? formatValue(d.value),
      }));
      return (
        <View style={styles.pieWrap}>
          <PieChart
            data={colored}
            radius={height / 2.2}
            donut
            innerRadius={height / 3.5}
            innerCircleColor={theme.bgSecondary}
            centerLabelComponent={() => (
              <View style={styles.pieCenterLabel}>
                <Text style={{ fontSize: 10, color: theme.textTertiary }}>Total</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>
                  {formatValue(colored.reduce((s, d) => s + d.value, 0))}
                </Text>
              </View>
            )}
            isAnimated
            animationDuration={700}
          />
          <View style={styles.legend}>
            {colored.map((d, i) => (
              <View key={i} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                <Text style={{ fontSize: 11, color: theme.textSecondary, flex: 1 }} numberOfLines={1}>
                  {d.label ?? `Item ${i + 1}`}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textPrimary }}>
                  {formatValue(d.value)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.bgSecondary, borderColor: theme.borderPrimary }]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
          )}
        </View>
      </View>
      <View style={styles.chartBody}>{renderBody()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: Typography.size.md,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: Typography.size.xs,
    marginTop: 2,
  },
  chartBody: {
    alignItems: 'center',
  },
  stateBox: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  stateText: {
    fontSize: Typography.size.sm,
    textAlign: 'center',
    maxWidth: 240,
  },
  retryBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 7,
    marginTop: 4,
  },
  pieWrap: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.md,
  },
  pieCenterLabel: {
    alignItems: 'center',
  },
  legend: {
    width: '100%',
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
