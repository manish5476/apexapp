import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Spacing, Typography } from '@/src/constants/theme';
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgSecondary }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText style={styles.title}>Analytics Hub</ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>All migrated analytics screens from the Angular admin module.</ThemedText>

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
                  {category}
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
  title: { fontSize: Typography.size['3xl'], fontWeight: '700' },
  subtitle: { fontSize: Typography.size.sm, marginBottom: Spacing.sm },
  searchInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: Typography.size.sm },
  categoryWrap: { paddingBottom: 2, gap: 8 },
  categoryChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  cardPress: { borderRadius: 14 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: { fontSize: Typography.size.md, fontWeight: '700' },
  cardSubtitle: { fontSize: Typography.size.xs },
  cardMeta: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginTop: 4 },
});
