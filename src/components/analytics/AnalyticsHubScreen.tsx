import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, Themes, Typography, getElevation } from '@/src/constants/theme';


import { useAppTheme } from '@/src/hooks/use-app-theme';
import { ADMIN_ANALYTICS_SCREENS } from '@/src/features/analytics/admin-analytics-config';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AnalyticsHubScreen() {
  const theme = useAppTheme();
  const [search, setSearch] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState('All');

  const categories = React.useMemo(
    () => ['All', ...Array.from(new Set(ADMIN_ANALYTICS_SCREENS.map((s) => s.category)))],
    []
  );

  const filteredScreens = React.useMemo(() => {
    return ADMIN_ANALYTICS_SCREENS.filter((screen) => {
      const byCategory = activeCategory === 'All' || screen.category === activeCategory;
      const q = search.trim().toLowerCase();
      const byText = !q
        || screen.title.toLowerCase().includes(q)
        || screen.subtitle.toLowerCase().includes(q)
        || screen.slug.toLowerCase().includes(q);
      return byCategory && byText;
    });
  }, [activeCategory, search]);

  const categoryCounts = React.useMemo(() => {
    return categories.reduce<Record<string, number>>((acc, category) => {
      if (category === 'All') {
        acc[category] = ADMIN_ANALYTICS_SCREENS.length;
      } else {
        acc[category] = ADMIN_ANALYTICS_SCREENS.filter((screen) => screen.category === category).length;
      }
      return acc;
    }, {});
  }, [categories]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgSecondary }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.heroCard, { borderColor: theme.borderPrimary, backgroundColor: theme.bgPrimary }]}>
          <View style={styles.heroTop}>
            <View style={[styles.heroIconWrap, { backgroundColor: `${theme.accentPrimary}18` }]}>
              <Ionicons name="analytics-outline" size={20} color={theme.accentPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.title}>Analytics Hub</ThemedText>
              <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
                Unified dashboards aligned with Apex-Infinity web analytics.
              </ThemedText>
            </View>
          </View>
          <View style={styles.heroStatsRow}>
            <View style={[styles.heroStat, { borderColor: theme.borderPrimary }]}>
              <ThemedText style={styles.heroStatValue}>{ADMIN_ANALYTICS_SCREENS.length}</ThemedText>
              <ThemedText style={[styles.heroStatLabel, { color: theme.textSecondary }]}>Dashboards</ThemedText>
            </View>
            <View style={[styles.heroStat, { borderColor: theme.borderPrimary }]}>
              <ThemedText style={styles.heroStatValue}>{categories.length - 1}</ThemedText>
              <ThemedText style={[styles.heroStatLabel, { color: theme.textSecondary }]}>Categories</ThemedText>
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => router.push('/(tabs)/analytics/settings/ownership' as any)}
          style={({ pressed }) => [styles.cardPress, pressed && { opacity: 0.85 }]}
        >
          <ThemedView style={[styles.card, { borderColor: theme.borderPrimary }]}>
            <View style={[styles.iconWrap, { backgroundColor: theme.bgTernary }]}>
              <Ionicons name="key-outline" size={20} color={theme.accentPrimary} />
            </View>
            <View style={styles.cardBody}>
              <ThemedText style={styles.cardTitle}>Accept Ownership</ThemedText>
              <ThemedText style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                Finalize ownership transfer requests securely.
              </ThemedText>
              <ThemedText style={[styles.cardMeta, { color: theme.textTertiary }]}>Organization</ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
          </ThemedView>
        </Pressable>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search analytics screens..."
          placeholderTextColor={theme.textTertiary}
          style={[styles.searchInput, { color: theme.textPrimary, borderColor: theme.borderPrimary, backgroundColor: theme.bgPrimary }]}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryWrap}>
          {categories.map((category) => {
            const active = category === activeCategory;
            return (
              <Pressable
                key={category}
                onPress={() => setActiveCategory(category)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: active ? theme.accentPrimary : theme.bgPrimary,
                    borderColor: active ? theme.accentPrimary : theme.borderPrimary,
                  },
                ]}
              >
                <ThemedText style={{ fontSize: Typography.size.xs, color: active ? theme.bgPrimary : theme.textSecondary, fontWeight: '600' }}>
                  {category} ({categoryCounts[category] ?? 0})
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        {filteredScreens.map((screen) => (
          <Pressable
            key={screen.slug}
            onPress={() => router.push(`/(tabs)/analytics/${screen.slug}` as any)}
            style={({ pressed }) => [styles.cardPress, pressed && { opacity: 0.85 }]}
          >
            <ThemedView style={[styles.card, { borderColor: theme.borderPrimary }]}>
              <View style={[styles.iconWrap, { backgroundColor: theme.bgTernary }]}>
                <Ionicons name={screen.icon as any} size={20} color={theme.accentPrimary} />
              </View>
              <View style={styles.cardBody}>
                <ThemedText style={styles.cardTitle}>{screen.title}</ThemedText>
                <ThemedText style={[styles.cardSubtitle, { color: theme.textSecondary }]}>{screen.subtitle}</ThemedText>
                <ThemedText style={[styles.cardMeta, { color: theme.textTertiary }]}>{screen.category}</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
            </ThemedView>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md },
  heroCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: Spacing.xl,
    gap: Spacing.lg,
    ...getElevation(2, Themes.light), // Default light elevation for base
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatsRow: { flexDirection: 'row', gap: Spacing.md },
  heroStat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  heroStatValue: { fontSize: Typography.size.xl, fontWeight: '800', fontFamily: 'Plus Jakarta Sans' },
  heroStatLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  title: { fontSize: Typography.size['3xl'], fontWeight: '800', fontFamily: 'Plus Jakarta Sans', letterSpacing: -0.5 },
  subtitle: { fontSize: Typography.size.sm, fontFamily: 'Inter', opacity: 0.8 },
  searchInput: { 
    borderWidth: 1, 
    borderRadius: 16, 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    fontSize: Typography.size.md,
    fontFamily: 'Inter'
  },
  categoryWrap: { paddingBottom: 4, gap: 10 },
  categoryChip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  cardPress: { borderRadius: 18, marginBottom: 4 },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontSize: Typography.size.md, fontWeight: '700', fontFamily: 'Plus Jakarta Sans' },
  cardSubtitle: { fontSize: 12, fontFamily: 'Inter', opacity: 0.7, lineHeight: 16 },
  cardMeta: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
});
